"""Background workers for analysis and execution tasks."""

import logging
from app.db import get_supabase

logger = logging.getLogger(__name__)


async def run_analysis(repo_id: str) -> None:
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

        # Phase 2 will fill in the actual analysis logic here
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

        # Steps 3-6: Analysis pipeline (Phase 2)
        digest = await generate_repo_digest(clone_path)
        summaries = await summarize_files(clone_path, digest)
        await infer_features(run_id, digest, summaries)

        # Mark completed
        db.table("analysis_runs").update(
            {"status": "completed", "digest_json": digest}
        ).eq("id", run_id).execute()
        db.table("repos").update({"status": "ready"}).eq("id", repo_id).execute()

    except NotImplementedError:
        logger.warning(f"Analysis for repo {repo_id} — service not yet implemented")
        db.table("repos").update({"status": "error"}).eq("id", repo_id).execute()
    except Exception as e:
        logger.exception(f"Analysis failed for repo {repo_id}: {e}")
        db.table("repos").update({"status": "error"}).eq("id", repo_id).execute()


async def run_execution(execution_run_id: str) -> None:
    """Background task: run autonomous feature build."""
    try:
        from app.services.execution_service import execute_build

        await execute_build(execution_run_id)
    except NotImplementedError:
        logger.warning(
            f"Execution {execution_run_id} — service not yet implemented"
        )
        db = get_supabase()
        db.table("execution_runs").update(
            {"status": "failed"}
        ).eq("id", execution_run_id).execute()
    except Exception as e:
        logger.exception(f"Execution failed for run {execution_run_id}: {e}")
        db = get_supabase()
        db.table("execution_runs").update(
            {"status": "failed"}
        ).eq("id", execution_run_id).execute()
