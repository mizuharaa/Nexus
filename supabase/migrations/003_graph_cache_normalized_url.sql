-- Graph caching: allow lookup by normalized repository URL
alter table repos add column if not exists normalized_github_url text;

create index if not exists idx_repos_normalized_github_url on repos(normalized_github_url);

-- Backfill existing rows so URL lookup works
update repos
set normalized_github_url = lower(
    regexp_replace(
        regexp_replace(trim(trailing '/' from coalesce(github_url, '')), '\.git$', ''),
        '^https?://[^/]+',
        'https://github.com',
        'i'
    )
)
where normalized_github_url is null and github_url is not null and github_url != '';
