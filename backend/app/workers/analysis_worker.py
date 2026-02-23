"""Background workers for analysis and execution tasks."""

import logging
import shutil

from app.db import get_supabase

logger = logging.getLogger(__name__)


async def run_analysis(repo_id: str, openai_api_key: str | None = None) -> None:
    """Background task: run full repo analysis pipeline.

    Steps:
      1. Clone repo
      2. Count LOC (reject if > 100k)
      3. Generate digest
      4. Summarize files via LLM
      5. Infer features via LLM
      6. Store everything in Supabase
    """
    db = get_supabase()
    clone_path: str | None = None

    try:
        # Update status to analyzing
        db.table("repos").update({"status": "analyzing"}).eq("id", repo_id).execute()

        # Create analysis run record
        run = (
            db.table("analysis_runs")
            .insert({"repo_id": repo_id, "status": "running"})
            .execute()
        )
        run_id = run.data[0]["id"]

        from app.services.analysis_service import (
            generate_repo_digest,
            summarize_files,
            infer_features,
        )
        from app.services.github_service import clone_repo, count_loc
        from app.config import settings

        # Get repo details
        repo = db.table("repos").select("*").eq("id", repo_id).execute()
        github_url = repo.data[0]["github_url"]

        # Step 1: Clone
        clone_path = clone_repo(github_url)

        # Step 2: LOC check
        loc = count_loc(clone_path)
        if loc > settings.max_loc:
            db.table("repos").update({"status": "error"}).eq("id", repo_id).execute()
            db.table("analysis_runs").update(
                {"status": "failed"}
            ).eq("id", run_id).execute()
            logger.error(f"Repo {repo_id} exceeds LOC limit: {loc}")
            return

        db.table("repos").update({"loc_count": loc}).eq("id", repo_id).execute()

        # Step 3: Generate digest
        digest = await generate_repo_digest(clone_path)

        # Store framework on repo record
        if digest.get("framework"):
            db.table("repos").update(
                {"framework_detected": digest["framework"]}
            ).eq("id", repo_id).execute()

        # Step 4: Summarize key files via LLM
        summaries = await summarize_files(clone_path, digest, api_key=openai_api_key)

        # Step 5: Infer features via LLM and store in Supabase
        await infer_features(run_id, digest, summaries, repo_path=clone_path, api_key=openai_api_key)

        # Step 5b: Compute risk scores for feature nodes
        from app.services.risk_service import compute_risk_scores

        await compute_risk_scores(
            run_id,
            clone_path,
            digest,
            summaries,
            api_key=openai_api_key,
        )

        # Step 6: Mark completed
        db.table("analysis_runs").update(
            {"status": "completed", "digest_json": digest}
        ).eq("id", run_id).execute()
        from app.services.graph_cache import normalize_github_url, invalidate_graph_cache
        repo_row = db.table("repos").select("github_url").eq("id", repo_id).execute()
        normalized_url = normalize_github_url(repo_row.data[0]["github_url"]) if repo_row.data else None
        update_payload = {"status": "ready", "active_analysis_run_id": run_id}
        if normalized_url:
            update_payload["normalized_github_url"] = normalized_url
        db.table("repos").update(update_payload).eq("id", repo_id).execute()
        invalidate_graph_cache(repo_id)

        logger.info(f"Analysis completed for repo {repo_id}")

    except Exception as e:
        logger.exception(f"Analysis failed for repo {repo_id}: {e}")
        db.table("repos").update({"status": "error"}).eq("id", repo_id).execute()
    finally:
        # Clean up cloned repo
        if clone_path:
            try:
                shutil.rmtree(clone_path, ignore_errors=True)
            except Exception:
                pass


async def run_analysis_update(
    repo_id: str, openai_api_key: str | None = None
) -> None:
    """Background task: re-run analysis with current graph context (Update Graph flow).

    Creates a new analysis run. When done, sets it as pending_analysis_run_id
    for user to preview and apply/revert.
    """
    db = get_supabase()
    clone_path: str | None = None

    try:
        db.table("repos").update({"status": "updating"}).eq("id", repo_id).execute()

        # Get current graph (active run or latest completed)
        repo_row = db.table("repos").select("active_analysis_run_id").eq("id", repo_id).execute()
        active_run_id = (
            repo_row.data[0].get("active_analysis_run_id")
            if repo_row.data else None
        )
        if not active_run_id:
            run_result = (
                db.table("analysis_runs")
                .select("id")
                .eq("repo_id", repo_id)
                .eq("status", "completed")
                .order("completed_at", desc=True)
                .limit(1)
                .execute()
            )
            if not run_result.data:
                raise ValueError("No completed analysis run found to update from")
            active_run_id = run_result.data[0]["id"]

        nodes_result = (
            db.table("feature_nodes")
            .select("*")
            .eq("analysis_run_id", active_run_id)
            .execute()
        )
        current_nodes = nodes_result.data or []

        # Create new analysis run
        run = (
            db.table("analysis_runs")
            .insert({"repo_id": repo_id, "status": "running"})
            .execute()
        )
        run_id = run.data[0]["id"]

        from app.services.analysis_service import (
            generate_repo_digest,
            summarize_files,
            infer_features_update,
        )
        from app.services.github_service import clone_repo, count_loc
        from app.config import settings

        repo = db.table("repos").select("*").eq("id", repo_id).execute()
        github_url = repo.data[0]["github_url"]

        clone_path = clone_repo(github_url)
        loc = count_loc(clone_path)
        if loc > settings.max_loc:
            db.table("analysis_runs").update({"status": "failed"}).eq("id", run_id).execute()
            db.table("repos").update({"status": "ready"}).eq("id", repo_id).execute()
            logger.error(f"Repo {repo_id} exceeds LOC limit: {loc}")
            return

        digest = await generate_repo_digest(clone_path)
        if digest.get("framework"):
            db.table("repos").update(
                {"framework_detected": digest["framework"]}
            ).eq("id", repo_id).execute()

        summaries = await summarize_files(clone_path, digest, api_key=openai_api_key)
        await infer_features_update(
            run_id, digest, summaries, current_nodes, api_key=openai_api_key
        )

        from app.services.risk_service import compute_risk_scores
        await compute_risk_scores(
            run_id, clone_path, digest, summaries, api_key=openai_api_key
        )

        db.table("analysis_runs").update(
            {"status": "completed", "digest_json": digest}
        ).eq("id", run_id).execute()

        db.table("repos").update({
            "status": "ready",
            "pending_analysis_run_id": run_id,
        }).eq("id", repo_id).execute()

        from app.services.graph_cache import invalidate_graph_cache
        invalidate_graph_cache(repo_id)

        logger.info(f"Graph update completed for repo {repo_id}, run {run_id}")

    except Exception as e:
        logger.exception(f"Graph update failed for repo {repo_id}: {e}")
        db.table("repos").update({"status": "ready"}).eq("id", repo_id).execute()
    finally:
        if clone_path:
            try:
                shutil.rmtree(clone_path, ignore_errors=True)
            except Exception:
                pass


async def run_plan_phase(
    execution_run_id: str, openai_api_key: str | None = None
) -> None:
    """Background task: run plan generation phase (stops at awaiting_approval)."""
    try:
        from app.services.execution_service import execute_plan_phase

        await execute_plan_phase(execution_run_id)
    except Exception as e:
        logger.exception(f"Plan phase failed for run {execution_run_id}: {e}")
        db = get_supabase()
        db.table("execution_runs").update(
            {"status": "failed"}
        ).eq("id", execution_run_id).execute()


async def run_regenerate_plan_with_feedback(
    execution_run_id: str, openai_api_key: str | None = None
) -> None:
    """Background task: regenerate plan integrating user feedback (same _generate_plan, feedback in user msg)."""
    try:
        from app.services.execution_service import regenerate_plan_with_feedback

        await regenerate_plan_with_feedback(execution_run_id, api_key=openai_api_key)
    except Exception as e:
        logger.exception(f"Regenerate plan failed for run {execution_run_id}: {e}")
        db = get_supabase()
        db.table("execution_runs").update(
            {"status": "failed"}
        ).eq("id", execution_run_id).execute()


async def run_build_phase(execution_run_id: str) -> None:
    """Background task: run build phase after user approval."""
    try:
        from app.services.execution_service import execute_build_phase

        await execute_build_phase(execution_run_id)
    except Exception as e:
        logger.exception(f"Build phase failed for run {execution_run_id}: {e}")
        db = get_supabase()
        db.table("execution_runs").update(
            {"status": "failed"}
        ).eq("id", execution_run_id).execute()


async def run_retry_build(execution_run_id: str) -> None:
    """Background task: retry a failed build with error context."""
    try:
        from app.services.execution_service import retry_build_phase

        await retry_build_phase(execution_run_id)
    except Exception as e:
        logger.exception(f"Retry failed for run {execution_run_id}: {e}")
        db = get_supabase()
        db.table("execution_runs").update(
            {"status": "failed"}
        ).eq("id", execution_run_id).execute()
