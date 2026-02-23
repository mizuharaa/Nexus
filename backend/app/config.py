from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"

    # GitHub
    github_token: str = ""

    # App
    sandbox_base_dir: str = "./sandboxes"
    max_loc: int = 100_000
    max_file_changes: int = 25
    max_fix_iterations: int = 2
    claude_code_timeout: int = 1800  # seconds (30 min) for Claude Code implementation

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
