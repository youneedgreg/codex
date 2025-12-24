<?php

namespace App\Jobs;

use App\Models\User;
use App\Models\Verification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VerifyGistJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public User $user, public Verification $verification)
    {
        //
    }

    public function handle(): void
    {
        try {
            // Check if URL is raw, if not try to convert or fetch main page (raw is better)
            // For simplicity, we fetch the URL provided. The user should ideally provide raw.
            // But if they provide the main Gist URL, we might need to look for the raw button or fetch metadata.
            // Let's assume we try to fetch the content. Github Gist HTML page contains the code.
            
            $response = Http::get($this->verification->gist_url);
            
            if ($response->failed()) {
                Log::error("Gist fetch failed for user {$this->user->id}");
                return;
            }

            $content = $response->body();

            if (str_contains($content, $this->verification->token)) {
                $this->user->update(['is_verified' => true]);
                $this->verification->update(['status' => 'approved']);
            } else {
                // We might mark as rejected or just leave as pending with a note?
                // For now, let's keep it pending but maybe log it.
                // Or maybe the user just pasted the wrong link.
                Log::info("Verification failed. Token not found in Gist.");
            }
        } catch (\Exception $e) {
            Log::error("Verification Job Exception: " . $e->getMessage());
        }
    }
}
