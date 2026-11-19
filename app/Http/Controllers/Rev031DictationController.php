<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class Rev031DictationController extends Controller
{
    // Fixed loopback service already running on this computer. No configurable remote URL,
    // uploaded file, transcript, or credential is logged or stored by this adapter.
    public function health(): JsonResponse
    {
        try {
            $response = Http::timeout(5)->get('http://127.0.0.1:8094/api/dictation/health');

            return response()->json($response->json() ?? ['ready' => false, 'available' => false])->header('Cache-Control', 'no-store');
        } catch (ConnectionException) {
            return response()->json(['ready' => false, 'available' => false])->header('Cache-Control', 'no-store');
        }
    }

    public function transcribe(Request $request): JsonResponse
    {
        abort_unless($request->header('X-InsectMES-Dictation') === '1', 403);
        $audio = $request->getContent();
        abort_if(strlen($audio) < 1 || strlen($audio) > 8 * 1024 * 1024, 413);
        try {
            $response = Http::withHeaders(['Origin' => 'http://127.0.0.1:8094', 'X-InsectMES-Dictation' => '1'])
                ->withBody($audio, $request->header('Content-Type', 'application/octet-stream'))
                ->timeout(115)->post('http://127.0.0.1:8094/api/dictation/transcribe');

            return response()->json($response->json() ?? ['error' => 'No se pudo transcribir el audio.'], $response->status())->header('Cache-Control', 'no-store');
        } catch (ConnectionException) {
            return response()->json(['error' => 'El servicio local de dictado no está disponible.'], 503);
        }
    }
}
