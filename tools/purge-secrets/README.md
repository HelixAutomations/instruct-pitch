Purging secrets from Git history (safe workflow)

This folder contains a small runbook and placeholder mapping files to help you purge leaked secrets from the repository history. It does NOT run anything for you. Replace the placeholder tokens below with the actual secret values before running the commands, and follow the safety checklist.

High-level recommended workflow
- Immediately rotate the leaked credentials in the provider dashboard so the exposed values are invalidated.
- Update running services to use the new keys (App Settings/Key Vault) before or immediately after rotation to avoid outages.
- Create a local mirror/bare clone of the repo and test the purge steps there first.
- After verification, coordinate with your team and force-push the cleaned history to the remote.

Prerequisites
- Java (for BFG) or Python and git-filter-repo installed.
- Permissions to force-push branches and tags to the remote repository.

Option A — Using BFG (easy, fast)
1. Mirror-clone the repo:
   git clone --mirror git@github.com:HelixAutomations/instruct-pitch.git repo-mirror.git
   cd repo-mirror.git
2. Create `bfg-replacements.txt` (one exact secret string per line).
3. Run BFG (example):
   java -jar bfg.jar --replace-text ../tools/purge-secrets/bfg-replacements.txt
4. Clean and repack:
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
5. Force-push cleaned history:
   git push --force --all origin
   git push --force --tags origin

Option B — Using git-filter-repo (flexible)
1. Bare clone:
   git clone --bare git@github.com:HelixAutomations/instruct-pitch.git repo.git
   cd repo.git
2. Create `git-filter-repo-replacements.txt` mapping lines like:
   oldsecret==>***REMOVED***
3. Run git-filter-repo (example):
   python -m git_filter_repo --replace-text ../tools/purge-secrets/git-filter-repo-replacements.txt
4. Force-push cleaned branches and tags (same as BFG above).

Post-purge checklist
- Verify secrets absent from cleaned repo (git grep).
- Notify team to re-clone repository.
- Revoke any still-live leaked keys and create new ones.

If you want, I can produce a PowerShell script with these steps and a replacement file prefilled (locally only). Tell me which option you prefer.
