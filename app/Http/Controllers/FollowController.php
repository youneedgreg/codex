<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\NewFollower;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FollowController extends Controller
{
    public function store(User $user)
    {
        $authUser = Auth::user();

        if ($authUser->id === $user->id) {
            return back();
        }

        if ($authUser->following()->where('following_id', $user->id)->exists()) {
            $authUser->following()->detach($user->id);
        } else {
            $authUser->following()->attach($user->id);
            $user->notify(new NewFollower($authUser));
        }

        return back();
    }
}
