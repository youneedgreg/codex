<?php

namespace App\Http\Controllers;

use App\Models\Repo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class RepoController extends Controller
{
    public function userRepos(Request $request, $username)
    {
        $user = \App\Models\User::where('username', $username)->firstOrFail();

        $query = $user->repos();

        // Filter by language
        if ($request->has('language') && $request->language !== 'all') {
            $query->where('language', $request->language);
        }

        // Filter by folder
        if ($request->has('folder') && $request->folder !== 'all') {
            $query->where('folder', $request->folder);
        }

        // Sorting
        $sortKey = $request->input('sort', 'stars'); // default to start
        $sortDir = $request->input('direction', 'desc');

        if (in_array($sortKey, ['name', 'stars', 'language'])) {
            $query->orderBy($sortKey, $sortDir);
        } else {
             $query->latest();
        }

        $repos = $query->paginate(20)->withQueryString();
        
        // Get all unique languages and folders for filter dropdowns
        $languages = $user->repos()->select('language')->distinct()->pluck('language')->filter()->values();
        $folders = $user->repos()->select('folder')->distinct()->pluck('folder')->filter()->values();

        return \Inertia\Inertia::render('Repos/UserRepos', [
            'user' => $user,
            'repos' => $repos,
            'filters' => [
                'language' => $request->language,
                'folder' => $request->folder,
                'sort' => $sortKey,
                'direction' => $sortDir,
            ],
            'availableLanguages' => $languages,
            'availableFolders' => $folders,
        ]);
    }

    private function checkContribution($token, $owner, $repo, $username)
    {
        // First check: Is the user the owner?
        if (strcasecmp($owner, $username) === 0) {
            return true;
        }

        // Second check: Is the user a contributor (has commits)?
        try {
            $response = Http::withHeaders([
                'Authorization' => 'token ' . $token,
                'User-Agent' => 'Codex-App'
            ])->get("https://api.github.com/repos/{$owner}/{$repo}/commits", [
                'author' => $username,
                'per_page' => 1
            ]);

            if ($response->successful()) {
                $commits = $response->json();
                return count($commits) > 0;
            }
        } catch (\Exception $e) {
            // Log or ignore
        }

        return false;
    }

    public function import()
    {
        $user = Auth::user();
        
        try {
            $response = Http::withHeaders([
                'Authorization' => 'token ' . $user->github_token,
                'User-Agent' => 'Codex-App'
            ])->get("https://api.github.com/user/repos?type=public&per_page=100");

            if ($response->failed()) {
                return back()->with('error', 'Failed to fetch repos from GitHub');
            }

            $repos = $response->json();
            $importedCount = 0;

            foreach ($repos as $repoData) {
                // Skip codex repo or existing repos
                if ($repoData['name'] === 'codex' || $user->repos()->where('github_repo_id', $repoData['id'])->exists()) {
                    continue;
                }

                // Fetch README
                $readmeContent = '';
                $readmeResponse = Http::withHeaders([
                    'Authorization' => 'token ' . $user->github_token,
                    'User-Agent' => 'Codex-App',
                    'Accept' => 'application/vnd.github.raw'
                ])->get("https://api.github.com/repos/{$repoData['owner']['login']}/{$repoData['name']}/readme");

                if ($readmeResponse->successful()) {
                    $readmeContent = mb_substr($readmeResponse->body(), 0, 240);
                }

                $user->repos()->create([
                    'github_repo_id' => $repoData['id'],
                    'name' => $repoData['name'],
                    'description' => $repoData['description'],
                    'url' => $repoData['html_url'],
                    'language' => $repoData['language'],
                    'stars' => $repoData['stargazers_count'],
                    'user_notes' => $readmeContent ?: null,
                    'is_own_repo' => true,
                ]);

                $importedCount++;
            }

            return back()->with('success', "Successfully imported {$importedCount} repos.");

        } catch (\Exception $e) {
            return back()->with('error', 'Failed to import repos: ' . $e->getMessage());
        }
    }

    public function store(Request $request)
    {
        $request->validate([
            'url' => 'required|url|starts_with:https://github.com/',
            'user_notes' => 'nullable|string|max:240',
            'folder' => 'nullable|string|max:50',
        ]);

        // Basic parsing for now. In a real app we'd use the GitHub API to fetch details.
        // URL: https://github.com/owner/repo
        $parts = explode('/', parse_url($request->url, PHP_URL_PATH));
        if (count($parts) < 3) {
            return back()->withErrors(['url' => 'Invalid GitHub URL']);
        }
        
        $owner = $parts[1];
        $repoName = $parts[2];
        
        // Fetch repo details from GitHub API to get correct casing, description, language, stars
        // We use the authenticated user's token if available, or just public access
        
        try {
            $user = Auth::user();
            $response = Http::withHeaders([
                'Authorization' => 'token ' . $user->github_token,
                'User-Agent' => 'Codex-App'
            ])->get("https://api.github.com/repos/{$owner}/{$repoName}");

            if ($response->failed()) {
                return back()->withErrors(['url' => 'Repo not found or private']);
            }

            $data = $response->json();

            $user->repos()->updateOrCreate(
                ['github_repo_id' => $data['id']],
                [
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'url' => $data['html_url'],
                    'language' => $data['language'],
                    'stars' => $data['stargazers_count'],
                    'user_notes' => $request->user_notes,
                    'folder' => Auth::user()->is_verified ? $request->folder : null,
                    'is_own_repo' => $this->checkContribution($user->github_token, $data['owner']['login'], $data['name'], $user->username),
                ]
            );

            return back()->with('success', 'Repo added successfully');

        } catch (\Exception $e) {
            return back()->with('error', 'Failed to add repo: ' . $e->getMessage());
        }
    }

    public function update(Request $request, Repo $repo)
    {
        if ($repo->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'url' => 'required|url|starts_with:https://github.com/',
            'user_notes' => 'nullable|string|max:240',
            'folder' => 'nullable|string|max:50',
        ]);

        try {
            $user = Auth::user();
            
            // If URL changed, we need to fetch new data
            if ($request->url !== $repo->url) {
                $parts = explode('/', parse_url($request->url, PHP_URL_PATH));
                if (count($parts) < 3) {
                    return back()->withErrors(['url' => 'Invalid GitHub URL']);
                }
                
                $owner = $parts[1];
                $repoName = $parts[2];

                $response = Http::withHeaders([
                    'Authorization' => 'token ' . $user->github_token,
                    'User-Agent' => 'Codex-App'
                ])->get("https://api.github.com/repos/{$owner}/{$repoName}");

                if ($response->failed()) {
                    return back()->withErrors(['url' => 'Repo not found or private']);
                }

                $data = $response->json();

                $repo->update([
                    'github_repo_id' => $data['id'],
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'url' => $data['html_url'],
                    'language' => $data['language'],
                    'stars' => $data['stargazers_count'],
                    'user_notes' => $request->user_notes,
                    'folder' => Auth::user()->is_verified ? $request->folder : null,
                    'is_own_repo' => $this->checkContribution($user->github_token, $data['owner']['login'], $data['name'], $user->username),
                ]);
            } else {
                $repo->update([
                    'user_notes' => $request->user_notes,
                    'folder' => Auth::user()->is_verified ? $request->folder : null,
                ]);
            }

            return back()->with('success', 'Repo updated successfully');

        } catch (\Exception $e) {
            return back()->with('error', 'Failed to update repo: ' . $e->getMessage());
        }
    }

    public function refreshVerification(Repo $repo)
    {
        $user = Auth::user();
        if ($repo->user_id !== $user->id || !$user->is_verified) {
            abort(403);
        }

        try {
            // Re-parse owner and repo name from URL
            $parts = explode('/', parse_url($repo->url, PHP_URL_PATH));
            $owner = $parts[1];
            $repoName = $parts[2];

            $isContributor = $this->checkContribution($user->github_token, $owner, $repoName, $user->username);
            
            $repo->update(['is_own_repo' => $isContributor]);

            return back()->with($isContributor ? 'success' : 'error', $isContributor ? 'تم توثيق ملكية المشروع بنجاح' : 'لم يتم العثور على مساهمات لك في هذا المشروع بعد');
        } catch (\Exception $e) {
            return back()->with('error', 'فشل تحديث حالة التوثيق');
        }
    }

    public function toggleFeature(Repo $repo)
    {
        if ($repo->user_id !== Auth::id()) {
            abort(403);
        }

        if (!$repo->is_featured && Auth::user()->repos()->where('is_featured', true)->count() >= 3) {
            return back()->with('error', 'يمكنك تمييز 3 مشاريع فقط كحد أقصى');
        }

        $repo->update(['is_featured' => !$repo->is_featured]);

        return back()->with('success', $repo->is_featured ? 'تم تمييز المشروع' : 'تم إلغاء تمييز المشروع');
    }

    public function destroy(Repo $repo)
    {
        if ($repo->user_id !== Auth::id()) {
            abort(403);
        }
        $repo->delete();
        return back();
    }
}
