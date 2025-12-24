<?php

namespace App\Http\Controllers;

use App\Jobs\VerifyGistJob;
use App\Models\Verification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class VerificationController extends Controller
{
    public function show()
    {
        $user = Auth::user();
        
        // Find or create a pending verification to keep the same token
        $verification = Verification::firstOrCreate(
            ['user_id' => $user->id, 'status' => 'pending'],
            ['token' => 'verify-codex-' . Str::random(12), 'gist_url' => '']
        );

        return Inertia::render('Verification/Show', [
            'token' => $verification->token,
            'status' => $verification->status,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'gist_url' => 'required|url|starts_with:https://gist.github.com/',
        ]);

        $user = Auth::user();
        $verification = Verification::where('user_id', $user->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $verification->update(['gist_url' => $request->gist_url]);

        VerifyGistJob::dispatch($user, $verification);

        return back()->with('success', 'جارٍ التحقق من Gist...');
    }
}
