<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index()
    {
        return Inertia::render('Notifications/Index', [
            'notifications' => Auth::user()->notifications()->paginate(10)
        ]);
    }

    public function recent()
    {
        return response()->json([
            'notifications' => Auth::user()->notifications()->limit(5)->get()
        ]);
    }

    public function markAsRead($id)
    {
        Auth::user()->notifications()->where('id', $id)->firstOrFail()->markAsRead();
        return back();
    }
}
