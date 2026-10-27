<?php

use App\Http\Controllers\Api\FinflowController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/dashboard', [FinflowController::class, 'dashboard']);
    Route::post('/transactions', [FinflowController::class, 'storeTransaction']);
    Route::post('/transactions/import-csv', [FinflowController::class, 'importCsv']);
    Route::delete('/transactions/{id}', [FinflowController::class, 'destroyTransaction']);
    Route::post('/rules', [FinflowController::class, 'storeRule']);
});
