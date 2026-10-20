<?php

use App\Http\Controllers\MesController;
use App\Http\Controllers\MesIndustrialController;
use App\Http\Controllers\MesP0Controller;
use App\Http\Controllers\MesPhaseOneController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [MesController::class, 'dashboard'])->name('dashboard');
    Route::get('mes/{section}', [MesController::class, 'section'])->name('mes.section');
    Route::post('mes/inventory/receive', [MesController::class, 'receive'])->name('mes.inventory.receive');
    Route::patch('mes/inventory/{container}/move', [MesController::class, 'moveContainer'])->name('mes.inventory.move');
    Route::post('mes/production', [MesController::class, 'produce'])->name('mes.production.store');
    Route::patch('mes/nursery/{batch}/advance', [MesController::class, 'advanceNursery'])->name('mes.nursery.advance');
    Route::patch('mes/parameters/{parameter}', [MesController::class, 'updateParameter'])->name('mes.parameters.update');
    Route::patch('mes/work-centers/{workCenter}', [MesController::class, 'updateWorkCenter'])->name('mes.work-centers.update');
    Route::post('mes/orders', [MesP0Controller::class, 'createOrder'])->name('mes.orders.store');
    Route::patch('mes/orders/{order}/status', [MesP0Controller::class, 'updateOrderStatus'])->name('mes.orders.status');
    Route::post('mes/trace/{container}/split', [MesP0Controller::class, 'split'])->name('mes.trace.split');
    Route::post('mes/trace/merge', [MesP0Controller::class, 'merge'])->name('mes.trace.merge');
    Route::post('mes/quality/inspections', [MesP0Controller::class, 'inspectQuality'])->name('mes.quality.inspect');
    Route::patch('mes/quality/inspections/{inspection}/disposition', [MesP0Controller::class, 'disposeQuality'])->name('mes.quality.dispose');
    Route::post('mes/environment/readings', [MesP0Controller::class, 'recordEnvironment'])->name('mes.environment.record');
    Route::patch('mes/environment/readings/{reading}/acknowledge', [MesP0Controller::class, 'acknowledgeEnvironment'])->name('mes.environment.acknowledge');
    Route::post('mes/biosecurity/events', [MesP0Controller::class, 'reportBiosecurity'])->name('mes.biosecurity.store');
    Route::patch('mes/biosecurity/events/{event}/close', [MesP0Controller::class, 'closeBiosecurity'])->name('mes.biosecurity.close');
    Route::post('mes/mass-balance/{order}', [MesP0Controller::class, 'closeMassBalance'])->name('mes.mass-balance.close');
    Route::post('mes/continuity/backup', [MesP0Controller::class, 'runBackup'])->name('mes.continuity.backup');
    Route::post('mes/feeding', [MesPhaseOneController::class, 'recordFeeding'])->name('mes.feeding.store');
    Route::post('mes/quality/deviations', [MesPhaseOneController::class, 'createDeviation'])->name('mes.quality.deviations.store');
    Route::patch('mes/quality/deviations/{deviation}/close', [MesPhaseOneController::class, 'closeDeviation'])->name('mes.quality.deviations.close');
    Route::post('mes/maintenance/assets', [MesPhaseOneController::class, 'createAsset'])->name('mes.maintenance.assets.store');
    Route::post('mes/maintenance/work-orders', [MesPhaseOneController::class, 'createWorkOrder'])->name('mes.maintenance.orders.store');
    Route::patch('mes/maintenance/work-orders/{workOrder}/complete', [MesPhaseOneController::class, 'completeWorkOrder'])->name('mes.maintenance.orders.complete');
    Route::post('mes/performance/downtimes', [MesIndustrialController::class, 'openDowntime'])->name('mes.performance.downtimes.store');
    Route::patch('mes/performance/downtimes/{downtime}/close', [MesIndustrialController::class, 'closeDowntime'])->name('mes.performance.downtimes.close');
    Route::post('mes/performance/oee', [MesIndustrialController::class, 'recordOee'])->name('mes.performance.oee.store');
    Route::post('mes/quality/certificates', [MesIndustrialController::class, 'createCertificate'])->name('mes.quality.certificates.store');
    Route::patch('mes/quality/certificates/{certificate}/approve', [MesIndustrialController::class, 'approveCertificate'])->name('mes.quality.certificates.approve');
    Route::post('mes/quality/retention-samples', [MesIndustrialController::class, 'retainSample'])->name('mes.quality.retention.store');
    Route::post('mes/maintenance/spare-parts', [MesIndustrialController::class, 'createSparePart'])->name('mes.maintenance.spares.store');
    Route::post('mes/maintenance/spare-parts/consume', [MesIndustrialController::class, 'consumeSparePart'])->name('mes.maintenance.spares.consume');
});

require __DIR__.'/settings.php';
