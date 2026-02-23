"""Repository analysis: digest generation, file summaries, feature inference."""

import json
import os
from pathlib import Path

from pydantic import BaseModel

from app.db import get_supabase
from app.services.llm_service import call_llm_structured_list

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", "vendor",
    "__pycache__", ".venv", "venv", ".turbo", ".cache", "coverage",
}

CODE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".css",
    ".scss", ".html", ".md", ".yaml", ".yml", ".toml", ".prisma",
    ".graphql", ".gql", ".sql", ".env.example",
}

KEY_FILE_PATTERNS = {
    "package.json", "tsconfig.json", "README.md", "readme.md",
    ".env.example", "docker-compose.yml", "Dockerfile",
    "next.config.ts", "next.config.js", "next.config.mjs",
    "vite.config.ts", "vite.config.js",
    "tailwind.config.ts", "tailwind.config.js",
}

KEY_DIR_NAMES = {"pages", "routes", "api", "schema", "prisma", "models", "lib"}

FRAMEWORK_MARKERS = {
    "next": ["next"],
    "nuxt": ["nuxt"],
    "remix": ["@remix-run/react"],
    "gatsby": ["gatsby"],
    "vite": ["vite"],
    "express": ["express"],
    "fastify": ["fastify"],
    "nestjs": ["@nestjs/core"],
    "sveltekit": ["@sveltejs/kit"],
    "astro": ["astro"],
}

MAX_FILE_READ_BYTES = 30_000  # Cap individual file reads for LLM context

# ---------------------------------------------------------------------------
# Pydantic models for LLM structured output
# ---------------------------------------------------------------------------


class FileSummary(BaseModel):
    file_path: str
    summary: str
    role: str  # e.g. "page", "component", "api", "schema", "config", "util"


class InferredFeature(BaseModel):
    name: str
    description: str
    anchor_files: list[str] = []
    parent_feature: str | None = None
    related_features: list[str] = []


class InferredDomain(BaseModel):
    """Top-level product domain identified in Pass 1."""
    name: str
    description: str
    anchor_files: list[str] = []


class InferredSubFeature(BaseModel):
    """Sub-feature within a domain identified in Pass 2."""
    name: str
    description: str
    anchor_files: list[str] = []
    parent_feature: str  # always the domain name
    related_features: list[str] = []


class InferredFeatureUpdate(BaseModel):
    """Feature for graph update - supports explicit mapping to existing nodes."""
    name: str
    description: str
    anchor_files: list[str] = []
    parent_feature: str | None = None
    related_features: list[str] = []
    existing_node_id: str | None = None  # UUID of existing node being updated, or null for new


# ---------------------------------------------------------------------------
# Step 2: Generate Repo Digest (pure filesystem, no LLM)
# ---------------------------------------------------------------------------


async def generate_repo_digest(repo_path: str) -> dict:
    """Scan the repo and produce a structured digest.

    Returns a dict with:
      - file_tree: list of relative file paths
      - framework: detected framework name or None
      - dependencies: dict of dependency name -> version
      - dev_dependencies: dict of devDependency name -> version
      - scripts: dict of script name -> command
      - key_files: list of relative paths to important files
    """
    root = Path(repo_path)
    file_tree: list[str] = []
    key_files: list[str] = []

    for dirpath, dirnames, filenames in os.walk(root):
        # Prune vendor directories
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        rel_dir = Path(dirpath).relative_to(root)

        for fname in filenames:
            ext = Path(fname).suffix.lower()
            if ext not in CODE_EXTENSIONS and fname not in KEY_FILE_PATTERNS:
                continue

            rel_path = str(rel_dir / fname).replace("\\", "/")
            if rel_path.startswith("./"):
                rel_path = rel_path[2:]

            file_tree.append(rel_path)

            # Identify key files
            if fname in KEY_FILE_PATTERNS:
                key_files.append(rel_path)
            elif rel_dir.parts and rel_dir.parts[-1] in KEY_DIR_NAMES:
                key_files.append(rel_path)
            elif fname.endswith((".prisma", ".graphql", ".gql")):
                key_files.append(rel_path)

    # Parse package.json if it exists
    dependencies: dict[str, str] = {}
    dev_dependencies: dict[str, str] = {}
    scripts: dict[str, str] = {}
    framework: str | None = None

    pkg_path = root / "package.json"
    if pkg_path.exists():
        try:
            pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
            dependencies = pkg.get("dependencies", {})
            dev_dependencies = pkg.get("devDependencies", {})
            scripts = pkg.get("scripts", {})

            all_deps = {**dependencies, **dev_dependencies}
            for fw_name, markers in FRAMEWORK_MARKERS.items():
                if any(m in all_deps for m in markers):
                    framework = fw_name
                    break
        except (json.JSONDecodeError, OSError):
            pass

    # Parse Python project files (requirements.txt / pyproject.toml)
    if framework is None:
        py_deps: dict[str, str] = {}
        req_path = root / "requirements.txt"
        if req_path.exists():
            try:
                import re as _re
                for line in req_path.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#"):
                        pkg_name = _re.split(r"[>=<!~;\[]", line)[0].strip().lower()
                        if pkg_name:
                            py_deps[pkg_name] = "*"
            except OSError:
                pass

        pyproject_path = root / "pyproject.toml"
        if pyproject_path.exists() and not py_deps:
            try:
                content = pyproject_path.read_text(encoding="utf-8")
                import re as _re
                # Extract dependencies from [project.dependencies] or [tool.poetry.dependencies]
                for match in _re.findall(r'"?([\w-]+)\s*[>=<!~]', content):
                    py_deps[match.lower()] = "*"
            except OSError:
                pass

        if py_deps or (root / "pyproject.toml").exists() or req_path.exists():
            dependencies = py_deps
            # Detect specific Python framework
            for fw in ("fastapi", "django", "flask"):
                if fw in py_deps:
                    framework = fw
                    break
            else:
                framework = "python"

    # Parse Java project files (pom.xml / build.gradle)
    if framework is None:
        pom_path = root / "pom.xml"
        gradle_path = root / "build.gradle"
        gradle_kts_path = root / "build.gradle.kts"
        if pom_path.exists() or gradle_path.exists() or gradle_kts_path.exists():
            framework = "spring" if pom_path.exists() else "java"

    return {
        "file_tree": sorted(file_tree),
        "framework": framework,
        "dependencies": dependencies,
        "dev_dependencies": dev_dependencies,
        "scripts": scripts,
        "key_files": sorted(set(key_files)),
    }


# ---------------------------------------------------------------------------
# Step 3: File Summaries (LLM-powered)
# ---------------------------------------------------------------------------


async def _call_llm_for_summaries(
    file_contents: list[dict], api_key: str | None = None
) -> list[dict]:
    """Call the LLM to generate structured summaries for a batch of files."""
    system_prompt = (
        "You are a senior software engineer analyzing a codebase. "
        "For each file provided, produce a concise structured summary. "
        "Return a JSON object with a key 'summaries' containing a list. "
        "Each item must have: file_path (string), summary (1-2 sentence description), "
        "role (one of: page, component, api, schema, config, util, test, style, entry, other)."
    )

    user_content = "Summarize these files:\n\n"
    for fc in file_contents:
        user_content += f"--- {fc['path']} ---\n{fc['content'][:MAX_FILE_READ_BYTES]}\n\n"

    items = await call_llm_structured_list(
        system_prompt=system_prompt,
        user_prompt=user_content,
        item_model=FileSummary,
        list_key="summaries",
        api_key=api_key,
    )
    return [item.model_dump() for item in items]


async def summarize_files(
    repo_path: str, digest: dict, api_key: str | None = None
) -> list[dict]:
    """LLM-summarize relevant files into structured metadata.

    Reads each key file from disk, sends them in batches to the LLM,
    and returns a list of {file_path, summary, role} dicts.
    """
    key_files = digest.get("key_files", [])
    if not key_files:
        return []

    root = Path(repo_path)

    # Read file contents
    file_contents: list[dict] = []
    for rel_path in key_files:
        abs_path = root / rel_path
        if not abs_path.is_file():
            continue
        try:
            content = abs_path.read_text(encoding="utf-8", errors="ignore")
            file_contents.append({"path": rel_path, "content": content})
        except OSError:
            continue

    if not file_contents:
        return []

    # Batch into chunks of ~15 files to stay within context limits
    batch_size = 15
    all_summaries: list[dict] = []
    for i in range(0, len(file_contents), batch_size):
        batch = file_contents[i : i + batch_size]
        summaries = await _call_llm_for_summaries(batch, api_key=api_key)
        all_summaries.extend(summaries)

    return all_summaries


# ---------------------------------------------------------------------------
# Shared prompt fragments for product-oriented feature extraction
# ---------------------------------------------------------------------------

_FEW_SHOT_EXAMPLES = """
EXAMPLES of GOOD vs BAD feature names:
GOOD: "User Authentication", "Social Login", "Password Reset", "Product Search", "Shopping Cart", "Order Checkout", "Email Notifications", "User Profile", "Admin Dashboard", "File Upload", "Real-time Chat", "Payment Processing"
BAD: "Service Layer", "Database Integration", "API Routes", "Middleware", "Utils & Helpers", "State Management", "Error Handling", "Config", "Core Module", "Shared Components", "Worker Processes"

Example tree for an e-commerce Next.js app:
- Authentication (root) → Social Login, Password Reset, Session Management
- Product Catalog (root) → Product Search, Category Filtering, Product Detail Page
- Shopping (root) → Cart Management, Checkout Flow, Order History
- User Account (root) → Profile Settings, Address Book, Notification Preferences
"""

# Role ordering for route-anchored context: high-signal first
_ROLE_SECTIONS = [
    ("page", "USER-FACING ROUTES & PAGES"),
    ("api", "API ENDPOINTS"),
    ("schema", "SCHEMAS & MODELS"),
    ("component", "COMPONENTS"),
    ("entry", "ENTRY POINTS"),
    ("test", "TESTS"),
    ("config", "CONFIGURATION"),
    ("util", "UTILITIES"),
    ("style", "STYLES"),
    ("other", "OTHER FILES"),
]


def _build_route_anchored_context(
    digest: dict, file_summaries: list[dict]
) -> str:
    """Build user prompt content with files grouped by role, high-signal first."""
    parts = [
        f"Framework: {digest.get('framework', 'unknown')}",
        f"Dependencies: {json.dumps(digest.get('dependencies', {}))}",
        "",
    ]

    # Group summaries by role
    by_role: dict[str, list[dict]] = {}
    for s in file_summaries:
        role = s.get("role", "other")
        by_role.setdefault(role, []).append(s)

    # Emit each role section in priority order
    for role_key, section_title in _ROLE_SECTIONS:
        entries = by_role.pop(role_key, [])
        if entries:
            parts.append(f"{section_title}:")
            for s in entries:
                parts.append(f"- {s['file_path']}: {s['summary']} (role: {role_key})")
            parts.append("")

    # Any remaining roles not in _ROLE_SECTIONS
    for role_key, entries in by_role.items():
        if entries:
            parts.append(f"{role_key.upper()} FILES:")
            for s in entries:
                parts.append(f"- {s['file_path']}: {s['summary']} (role: {role_key})")
            parts.append("")

    # Full file tree for reference
    file_tree = digest.get("file_tree", [])
    if file_tree:
        parts.append(f"Full file tree (for reference):")
        parts.append(chr(10).join(file_tree))

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Step 4: Feature Inference (LLM-powered, stores to Supabase)
# Two-pass approach: domains first, then sub-features per domain
# ---------------------------------------------------------------------------


async def _call_llm_for_domains(
    digest: dict, file_summaries: list[dict], api_key: str | None = None
) -> list[dict]:
    """Pass 1: Identify top-level product domains from the codebase."""
    system_prompt = (
        "You are a senior software architect analyzing a codebase to identify "
        "its top-level PRODUCT DOMAINS — the major user-facing capability areas.\n\n"
        "IMPORTANT RULES:\n"
        "- Identify domains from the PRODUCT perspective, not the code architecture.\n"
        "- Each domain should represent a major area of functionality a user or stakeholder cares about.\n"
        "- DO NOT create architectural/infrastructure domains like 'Service Layer', 'Database Integration', "
        "'API Gateway', 'Middleware', 'Utils', 'Config', 'Shared Components', 'Core Infrastructure'.\n"
        "- Instead, identify WHAT the code DOES for users: 'Authentication', 'Content Management', "
        "'Billing', 'Search & Discovery', 'Notifications', etc.\n"
        "- Aim for 3-8 top-level domains based on routes, pages, API endpoints, and business logic.\n\n"
        "Return a JSON object with key 'domains' containing a list. Each domain must have:\n"
        "- name (string): concise, product-oriented domain name\n"
        "- description (string): 1-2 sentence explanation of what this domain does for the user\n"
        "- anchor_files (list[string]): relative file paths most related to this domain\n"
        + _FEW_SHOT_EXAMPLES
    )

    user_content = _build_route_anchored_context(digest, file_summaries)

    items = await call_llm_structured_list(
        system_prompt=system_prompt,
        user_prompt=user_content,
        item_model=InferredDomain,
        list_key="domains",
        api_key=api_key,
    )
    return [item.model_dump() for item in items]


async def _call_llm_for_domain_features(
    domain: dict,
    domain_summaries: list[dict],
    digest: dict,
    file_content: str = "",
    api_key: str | None = None,
) -> list[dict]:
    """Pass 2: For a single domain, identify 2-8 sub-features.

    Args:
        domain: Domain dict from Pass 1 (name, description, anchor_files).
        domain_summaries: File summaries relevant to this domain.
        digest: Full repo digest.
        file_content: Actual source code of domain-related files (read from disk).
        api_key: Optional OpenAI API key.
    """
    system_prompt = (
        "You are a senior software architect analyzing a specific product domain "
        "within a codebase. You are given the domain name, its description, file summaries, "
        "and the ACTUAL SOURCE CODE of relevant files. "
        "Identify the specific user-facing features within this domain.\n\n"
        "IMPORTANT RULES:\n"
        "- ONLY include features you can see actually implemented in the code provided. "
        "Do NOT speculate or infer features based on dependencies, framework conventions, "
        "or what apps like this 'usually have'.\n"
        "- Each feature should be something a developer could write a PR for, or a user could interact with.\n"
        "- DO NOT create architectural/infrastructure nodes like 'Service Layer', 'Database Integration', "
        "'API Gateway', 'Middleware', 'Utils', 'Config', 'Shared Components', 'Core Infrastructure'.\n"
        "- Name features as product capabilities, not code structure.\n"
        "- Every feature MUST have at least one anchor_file from the files shown to you.\n"
        "- Identify 2-8 sub-features for this domain.\n\n"
        "Return a JSON object with key 'features' containing a list. Each feature must have:\n"
        "- name (string): concise, product-oriented feature name\n"
        "- description (string): 1-2 sentence explanation of what this feature does\n"
        "- anchor_files (list[string]): relative file paths most related to this feature "
        "(MUST be files from the code provided)\n"
        "- parent_feature (string): MUST be exactly the domain name provided below\n"
        "- related_features (list[string]): names of related features within this domain\n"
        + _FEW_SHOT_EXAMPLES
    )

    user_content = (
        f"Domain: {domain['name']}\n"
        f"Domain description: {domain['description']}\n"
        f"Framework: {digest.get('framework', 'unknown')}\n\n"
        f"File summaries for this domain:\n"
    )
    for s in domain_summaries:
        user_content += f"- {s['file_path']}: {s['summary']} (role: {s.get('role', 'other')})\n"

    # Include actual source code
    if file_content:
        user_content += f"\n\nACTUAL SOURCE CODE (use this to verify features exist):\n{file_content}\n"

    items = await call_llm_structured_list(
        system_prompt=system_prompt,
        user_prompt=user_content,
        item_model=InferredSubFeature,
        list_key="features",
        api_key=api_key,
    )
    return [item.model_dump() for item in items]


def _match_summaries_to_domain(
    domain: dict, file_summaries: list[dict]
) -> list[dict]:
    """Find file summaries relevant to a domain based on anchor files and paths."""
    anchor_files = set(domain.get("anchor_files", []))
    if not anchor_files:
        return file_summaries  # fallback: send all summaries

    # Find summaries whose file_path matches or is in the same directory as an anchor
    anchor_dirs = set()
    for af in anchor_files:
        parts = af.rsplit("/", 1)
        if len(parts) > 1:
            anchor_dirs.add(parts[0])

    matched = []
    for s in file_summaries:
        fp = s["file_path"]
        if fp in anchor_files:
            matched.append(s)
        elif any(fp.startswith(d + "/") for d in anchor_dirs):
            matched.append(s)

    # If too few matched, return all summaries as fallback
    return matched if len(matched) >= 2 else file_summaries


# Role priority for file reading budget allocation (lower = higher priority)
_ROLE_PRIORITY = {
    "page": 0, "api": 1, "schema": 2, "entry": 3,
    "component": 4, "test": 5, "config": 6, "util": 7,
    "style": 8, "other": 9,
}

# Budget per domain for actual file content in Pass 2
_DOMAIN_CONTENT_BUDGET = 60_000  # chars


def _read_domain_files(
    repo_path: str,
    domain: dict,
    domain_summaries: list[dict],
    file_tree: list[str],
) -> str:
    """Read actual file content for a domain's relevant files within a budget.

    Reads anchor files first, then sibling files from the same directories,
    prioritized by role. Returns formatted file content string.
    """
    root = Path(repo_path)
    anchor_files = set(domain.get("anchor_files", []))

    # Collect all candidate files: anchors + siblings from anchor directories
    anchor_dirs = set()
    for af in anchor_files:
        parts = af.rsplit("/", 1)
        if len(parts) > 1:
            anchor_dirs.add(parts[0])

    candidates: list[tuple[int, str, str]] = []  # (priority, path, role)

    # Build a lookup from file_path -> role using summaries
    path_to_role: dict[str, str] = {}
    for s in domain_summaries:
        path_to_role[s["file_path"]] = s.get("role", "other")

    # Add anchor files first (highest priority)
    for af in anchor_files:
        if af in file_tree:
            role = path_to_role.get(af, "other")
            candidates.append((_ROLE_PRIORITY.get(role, 9), af, role))

    # Add sibling files from anchor directories
    for fp in file_tree:
        if fp in anchor_files:
            continue  # already added
        if any(fp.startswith(d + "/") for d in anchor_dirs):
            role = path_to_role.get(fp, "other")
            candidates.append((_ROLE_PRIORITY.get(role, 9) + 10, fp, role))

    # Sort by priority (anchor files first, then by role)
    candidates.sort(key=lambda x: x[0])

    # Read files within budget
    parts: list[str] = []
    total_chars = 0

    for _priority, rel_path, role in candidates:
        if total_chars >= _DOMAIN_CONTENT_BUDGET:
            break

        abs_path = root / rel_path
        if not abs_path.is_file():
            continue

        try:
            content = abs_path.read_text(encoding="utf-8", errors="ignore")
            content = content[:MAX_FILE_READ_BYTES]
        except OSError:
            continue

        # Check if adding this file would exceed budget
        entry = f"--- {rel_path} (role: {role}) ---\n{content}\n"
        if total_chars + len(entry) > _DOMAIN_CONTENT_BUDGET and parts:
            break  # don't exceed budget, but always include at least one file

        parts.append(entry)
        total_chars += len(entry)

    return "\n".join(parts)


async def infer_features(
    run_id: str, digest: dict, file_summaries: list[dict],
    repo_path: str = "",
    api_key: str | None = None,
) -> dict:
    """LLM-infer feature nodes and edges using two-pass approach, then store in Supabase.

    Pass 1: Identify top-level product domains.
    Pass 2: For each domain, read actual source code and identify sub-features.
    Post-processing: Validate anchor files exist in the repo.
    Returns {"nodes": [...], "edges": [...]}.
    """
    file_tree_set = set(digest.get("file_tree", []))

    # Pass 1: Get top-level domains
    domains = await _call_llm_for_domains(digest, file_summaries, api_key=api_key)

    if not domains:
        return {"nodes": [], "edges": []}

    # Validate domain anchor_files against actual file tree
    for d in domains:
        d["anchor_files"] = [f for f in d.get("anchor_files", []) if f in file_tree_set]

    # Pass 2: For each domain, read actual files and get sub-features
    raw_features: list[dict] = []

    # Add domains as root features
    for d in domains:
        raw_features.append({
            "name": d["name"],
            "description": d["description"],
            "anchor_files": d.get("anchor_files", []),
            "parent_feature": None,
            "related_features": [],
        })

    # Expand each domain into sub-features with actual code context
    for d in domains:
        domain_summaries = _match_summaries_to_domain(d, file_summaries)

        # Layer 1: Read actual source code for this domain's files
        file_content = ""
        if repo_path:
            file_content = _read_domain_files(
                repo_path, d, domain_summaries, digest.get("file_tree", [])
            )

        sub_features = await _call_llm_for_domain_features(
            d, domain_summaries, digest,
            file_content=file_content, api_key=api_key,
        )
        for sf in sub_features:
            # Ensure parent_feature points to the domain
            sf["parent_feature"] = d["name"]
            raw_features.append(sf)

    # Layer 2: Post-inference validation — drop sub-features with no valid anchor files
    validated_features: list[dict] = []
    for f in raw_features:
        is_root = f.get("parent_feature") is None
        valid_anchors = [a for a in f.get("anchor_files", []) if a in file_tree_set]
        f["anchor_files"] = valid_anchors  # clean up invalid paths

        if is_root or valid_anchors:
            validated_features.append(f)
        # else: sub-feature with 0 valid anchors → hallucinated, drop it

    raw_features = validated_features

    if not raw_features:
        return {"nodes": [], "edges": []}

    db = get_supabase()

    # --- Insert feature nodes ---
    # First pass: insert all nodes without parent refs to get their IDs
    name_to_id: dict[str, str] = {}
    all_nodes: list[dict] = []

    node_rows = [
        {
            "analysis_run_id": run_id,
            "name": f["name"],
            "description": f["description"],
            "anchor_files": f["anchor_files"],
        }
        for f in raw_features
    ]

    result = db.table("feature_nodes").insert(node_rows).execute()
    inserted = result.data

    for row in inserted:
        name_to_id[row["name"]] = row["id"]
        all_nodes.append(row)

    # Sanitize parent: break cycles and self-references (proper tree)
    def _would_create_cycle(child_name: str, parent_name: str) -> bool:
        seen = {child_name}
        cur = parent_name
        while cur and cur in name_to_id:
            if cur in seen:
                return True
            seen.add(cur)
            parent_of_cur = next(
                (f["parent_feature"] for f in raw_features if f["name"] == cur),
                None,
            )
            cur = parent_of_cur
        return False

    sanitized_parent: dict[str, str | None] = {}
    for f in raw_features:
        name = f["name"]
        parent = f.get("parent_feature")
        if not parent or parent not in name_to_id or parent == name:
            sanitized_parent[name] = None
        elif _would_create_cycle(name, parent):
            sanitized_parent[name] = None
        else:
            sanitized_parent[name] = parent

    # Second pass: set parent_feature_id where applicable
    for f in raw_features:
        parent_name = sanitized_parent.get(f["name"])
        if parent_name and parent_name in name_to_id:
            child_id = name_to_id.get(f["name"])
            parent_id = name_to_id[parent_name]
            if child_id:
                db.table("feature_nodes").update(
                    {"parent_feature_id": parent_id}
                ).eq("id", child_id).execute()

    # --- Insert tree edges only (parent -> child, no related/lateral) ---
    edges_to_insert: list[dict] = []
    seen_edges: set[tuple[str, str]] = set()

    for f in raw_features:
        node_id = name_to_id.get(f["name"])
        if not node_id:
            continue
        parent_name = sanitized_parent.get(f["name"])
        if parent_name and parent_name in name_to_id:
            parent_id = name_to_id[parent_name]
            key = (parent_id, node_id)
            if key not in seen_edges:
                seen_edges.add(key)
                edges_to_insert.append({
                    "analysis_run_id": run_id,
                    "source_node_id": parent_id,
                    "target_node_id": node_id,
                    "edge_type": "tree",
                })

    all_edges: list[dict] = []
    if edges_to_insert:
        edge_result = db.table("feature_edges").insert(edges_to_insert).execute()
        all_edges = edge_result.data

    return {"nodes": all_nodes, "edges": all_edges}


# ---------------------------------------------------------------------------
# Step 4b: Feature Inference for Graph Update (context-aware, conservative)
# ---------------------------------------------------------------------------


def _build_current_graph_context(nodes: list[dict]) -> str:
    """Build a text representation of the current graph for LLM context."""
    lines = []
    for n in nodes:
        parent = n.get("parent_feature_id") or "root"
        anchor = (n.get("anchor_files") or [])[:5]
        lines.append(
            f"ID: {n['id']} | Name: {n['name']!r} | Parent: {parent} | "
            f"Desc: {(n.get('description') or '')[:60]}... | "
            f"Anchor files: {anchor}"
        )
    return "\n".join(lines)


async def _call_llm_for_features_update(
    digest: dict,
    file_summaries: list[dict],
    current_nodes: list[dict],
    api_key: str | None = None,
) -> list[dict]:
    """Call the LLM to infer features with explicit mapping to current graph.

    LLM returns features. Each can have existing_node_id to indicate it updates
    that node. Features not in the list are considered removed.
    """
    system_prompt = (
        "You are a senior software architect re-analyzing a codebase to update "
        "its PRODUCT FEATURE TOPOLOGY. You are given the CURRENT feature graph and fresh "
        "analysis of the repo (file tree, summaries).\n\n"
        "Your job: produce an UPDATED feature list that reflects the current state "
        "of the codebase while being CONSERVATIVE with the existing graph.\n\n"
        "IMPORTANT: Identify features from the PRODUCT perspective, not the code architecture.\n"
        "- Each feature should be something a developer could write a PR for, or a user could interact with.\n"
        "- DO NOT create architectural/infrastructure nodes like 'Service Layer', 'Database Integration', "
        "'API Gateway', 'Middleware', 'Utils', 'Config', 'Shared Components', 'Core Infrastructure'.\n"
        "- Instead, identify WHAT the code DOES for users: 'User Authentication', 'Search & Filtering', "
        "'Email Notifications', 'Payment Processing', 'Dashboard Analytics', etc.\n"
        "- Top-level nodes should be major product domains (e.g., 'Authentication', 'Content Management', 'Billing').\n"
        "- Child nodes should be specific capabilities within that domain.\n"
        "- Aim for 15-40 features organized in a tree with 2-4 levels of depth.\n\n"
        "Return a JSON object with key 'features' containing a list. Each feature must have:\n"
        "- name (string): concise, product-oriented feature name (NOT code-structure names)\n"
        "- description (string): 1-2 sentence explanation of what this feature does for the user\n"
        "- anchor_files (list[string]): relative file paths most related to this feature\n"
        "- parent_feature (string|null): name of parent feature if this is a sub-feature\n"
        "- related_features (list[string]): names of related features (for context only)\n"
        "- existing_node_id (string|null): UUID of the existing node this updates, if this "
        "feature corresponds to one in the current graph. Use the exact ID from the context. "
        "If this is a NEW feature (not in current graph), use null.\n\n"
        "Rules:\n"
        "1. Wording: Do NOT change names or descriptions if it's not necessary. Keep the exact "
        "existing wording when the codebase and feature scope are unchanged. If it IS necessary "
        "(e.g., the codebase has evolved, the feature scope changed, or the current description is "
        "wrong or outdated), then you MUST update the wording to accurately reflect the current state.\n"
        "2. Add new features only when they clearly exist in the codebase.\n"
        "3. Omit features that no longer exist in the codebase (they will be removed).\n"
        "4. Use existing_node_id for features that map to current nodes, so we preserve identity.\n"
        "5. Organize in a strict TREE: every node (except roots) has exactly one parent. "
        "There can be 2-8 roots.\n"
        "6. Features added via 'Add feature' and merged PRs are in the repo - treat them like any "
        "other node; include or omit based on whether the code still exists.\n"
        "7. If existing nodes use architectural names (e.g., 'Service Layer'), rename them to "
        "product-oriented names that describe what the code actually does for users.\n"
        + _FEW_SHOT_EXAMPLES
    )

    graph_context = _build_current_graph_context(current_nodes)
    user_content = (
        f"CURRENT FEATURE GRAPH (preserve identity via existing_node_id when applicable):\n"
        f"{graph_context}\n\n"
        f"---\n\n"
        + _build_route_anchored_context(digest, file_summaries)
    )

    items = await call_llm_structured_list(
        system_prompt=system_prompt,
        user_prompt=user_content,
        item_model=InferredFeatureUpdate,
        list_key="features",
        api_key=api_key,
    )
    return [item.model_dump() for item in items]


async def infer_features_update(
    run_id: str,
    digest: dict,
    file_summaries: list[dict],
    current_nodes: list[dict],
    api_key: str | None = None,
) -> dict:
    """LLM-infer updated features with explicit mapping. Creates new nodes in run_id.

    Features with existing_node_id are logical updates; features not in the list
    are removed (omitted from the new run). Returns {"nodes": [...], "edges": [...]}.
    """
    raw_features = await _call_llm_for_features_update(
        digest, file_summaries, current_nodes, api_key=api_key
    )

    if not raw_features:
        return {"nodes": [], "edges": []}

    db = get_supabase()

    # Build set of valid existing node IDs (for parent resolution)
    current_ids = {n["id"] for n in current_nodes}
    name_to_id: dict[str, str] = {}
    all_nodes: list[dict] = []

    node_rows = [
        {
            "analysis_run_id": run_id,
            "name": f["name"],
            "description": f["description"],
            "anchor_files": f.get("anchor_files", []),
        }
        for f in raw_features
    ]

    result = db.table("feature_nodes").insert(node_rows).execute()
    inserted = result.data

    for row in inserted:
        name_to_id[row["name"]] = row["id"]
        all_nodes.append(row)

    # Sanitize parent: break cycles and self-references
    def _would_create_cycle(child_name: str, parent_name: str) -> bool:
        seen = {child_name}
        cur = parent_name
        while cur and cur in name_to_id:
            if cur in seen:
                return True
            seen.add(cur)
            parent_of_cur = next(
                (f.get("parent_feature") for f in raw_features if f["name"] == cur),
                None,
            )
            cur = parent_of_cur
        return False

    sanitized_parent: dict[str, str | None] = {}
    for f in raw_features:
        name = f["name"]
        parent = f.get("parent_feature")
        if not parent or parent not in name_to_id or parent == name:
            sanitized_parent[name] = None
        elif _would_create_cycle(name, parent):
            sanitized_parent[name] = None
        else:
            sanitized_parent[name] = parent

    for f in raw_features:
        parent_name = sanitized_parent.get(f["name"])
        if parent_name and parent_name in name_to_id:
            child_id = name_to_id.get(f["name"])
            parent_id = name_to_id[parent_name]
            if child_id:
                db.table("feature_nodes").update(
                    {"parent_feature_id": parent_id}
                ).eq("id", child_id).execute()

    edges_to_insert: list[dict] = []
    seen_edges: set[tuple[str, str]] = set()

    for f in raw_features:
        node_id = name_to_id.get(f["name"])
        if not node_id:
            continue
        parent_name = sanitized_parent.get(f["name"])
        if parent_name and parent_name in name_to_id:
            parent_id = name_to_id[parent_name]
            key = (parent_id, node_id)
            if key not in seen_edges:
                seen_edges.add(key)
                edges_to_insert.append({
                    "analysis_run_id": run_id,
                    "source_node_id": parent_id,
                    "target_node_id": node_id,
                    "edge_type": "tree",
                })

    all_edges: list[dict] = []
    if edges_to_insert:
        edge_result = db.table("feature_edges").insert(edges_to_insert).execute()
        all_edges = edge_result.data

    return {"nodes": all_nodes, "edges": all_edges}
