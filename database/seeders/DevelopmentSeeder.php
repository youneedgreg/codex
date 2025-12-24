<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Repo;
use App\Models\Post;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class DevelopmentSeeder extends Seeder
{
    public function run(): void
    {
        $usernames = [
            'sofanati-nour',
            'sb-nour',
            'SourceM7',
            '0xhsn',
            'i33mr'
        ];

        $dummyPosts = [
            "اليوم قمت بتحديث مكتبي البرمجية وإضافة ميزات جديدة لتحسين الأداء. #تطوير #برمجة",
            "استكشاف تقنيات جديدة في عالم الويب، متحمس جداً لما هو قادم! 🚀",
            "هل جربتم استخدام Bun بدلاً من Node.js؟ النتائج مبهرة حتى الآن.",
            "أعمل حالياً على مشروع مفتوح المصدر جديد، سأقوم بمشاركة الرابط قريباً.",
            "التوثيق هو أهم جزء في أي مشروع برمجي، لا تتجاهلوه أبداً.",
            "تجربة ممتعة في بناء واجهة مستخدم باستخدام Tailwind CSS و Shadcn UI.",
            "تعلمت اليوم شيئاً جديداً عن Laravel 11، الإضافات الجديدة مذهلة.",
            "تحرير الأخطاء (Debugging) استهلك مني 4 ساعات اليوم، لكن الحل كان بسيطاً جداً في النهاية.",
            "من المهم جداً الاهتمام بتجربة المستخدم (UI/UX) في تطبيقاتنا.",
            "مشاركة المعرفة هي ما يجعل مجتمع المطورين قوياً. انشر ما تتعلم!"
        ];

        foreach ($usernames as $username) {
            $this->command->info("Processing $username...");
            
            // Fetch User Info
            $userResponse = Http::withHeaders(['User-Agent' => 'Codex-App'])->get("https://api.github.com/users/$username");
            if (!$userResponse->successful()) {
                continue;
            }
            
            $userData = $userResponse->json();
            
            $user = User::updateOrCreate(
                ['github_id' => $userData['id']],
                [
                    'username' => $userData['login'],
                    'name' => $userData['name'] ?? $userData['login'],
                    'email' => $userData['email'] ?? ($userData['login'] . '@noreply.github.com'),
                    'avatar_url' => $userData['avatar_url'],
                    'bio' => $userData['bio'],
                    'website_url' => $userData['blog'],
                    'is_verified' => true,
                    'status' => 'active',
                ]
            );
            
            // Fetch Repos
            $reposResponse = Http::withHeaders(['User-Agent' => 'Codex-App'])->get("https://api.github.com/users/$username/repos?per_page=20");
            if ($reposResponse->successful()) {
                $reposData = $reposResponse->json();
                foreach ($reposData as $repoData) {
                    Repo::updateOrCreate(
                        ['github_repo_id' => $repoData['id']],
                        [
                            'user_id' => $user->id,
                            'name' => $repoData['name'],
                            'description' => $repoData['description'],
                            'url' => $repoData['html_url'],
                            'language' => $repoData['language'],
                            'stars' => $repoData['stargazers_count'],
                            'is_own_repo' => true,
                        ]
                    );
                }
            }

            // Create Random Posts
            $postCount = rand(2, 5);
            for ($i = 0; $i < $postCount; $i++) {
                $content = $dummyPosts[array_rand($dummyPosts)];
                Post::create([
                    'user_id' => $user->id,
                    'content' => $content,
                    'slug' => Str::slug(Str::limit($content, 50)) . '-' . Str::random(5),
                    'published_at' => now()->subHours(rand(1, 100)),
                ]);
            }
        }
    }
}
