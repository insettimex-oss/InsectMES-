<?php

use App\Http\Controllers\MesAdvancedController;
use App\Http\Controllers\MesController;
use App\Http\Controllers\MesIndustrialController;
use App\Http\Controllers\MesP0Controller;
use App\Http\Controllers\MesPhaseOneController;
use App\Http\Controllers\MesShopFloorController;
use App\Http\Controllers\UserAdministrationController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth', 'verified', 'password.changed'])->group(function () {
    Route::get('dashboard', [MesController::class, 'dashboard'])->middleware('permission:dashboard.read')->name('dashboard');
    Route::get('mes/{section}', [MesController::class, 'section'])->name('mes.section');
    Route::post('mes/inventory/receive', [MesController::class, 'receive'])->middleware('permission:inventory.write')->name('mes.inventory.receive');
    Route::patch('mes/inventory/{container}/move', [MesController::class, 'moveContainer'])->middleware('permission:inventory.write')->name('mes.inventory.move');
    Route::post('mes/production', [MesController::class, 'produce'])->middleware('permission:production.write')->name('mes.production.store');
    Route::post('mes/control/operations/{orderOperation}/start', [MesShopFloorController::class, 'start'])->middleware('permission:production.write')->name('mes.control.operations.start');
    Route::patch('mes/control/operations/{orderOperation}/checklist/{item}', [MesShopFloorController::class, 'checklist'])->middleware('permission:production.write')->name('mes.control.checklist.update');
    Route::patch('mes/control/sessions/{session}/pause', [MesShopFloorController::class, 'pause'])->middleware('permission:production.write')->name('mes.control.sessions.pause');
    Route::patch('mes/control/sessions/{session}/resume', [MesShopFloorController::class, 'resume'])->middleware('permission:production.write')->name('mes.control.sessions.resume');
    Route::post('mes/control/scrap', [MesShopFloorController::class, 'scrap'])->middleware('permission:production.write')->name('mes.control.scrap.store');
    Route::patch('mes/nursery/{batch}/advance', [MesController::class, 'advanceNursery'])->middleware('permission:production.write')->name('mes.nursery.advance');
    Route::patch('mes/parameters/{parameter}', [MesController::class, 'updateParameter'])->middleware('permission:administration.write')->name('mes.parameters.update');
    Route::patch('mes/work-centers/{workCenter}', [MesController::class, 'updateWorkCenter'])->middleware('permission:performance.write')->name('mes.work-centers.update');
    Route::post('mes/orders', [MesP0Controller::class, 'createOrder'])->middleware('permission:planning.write')->name('mes.orders.store');
    Route::patch('mes/orders/{order}/status', [MesP0Controller::class, 'updateOrderStatus'])->middleware('permission:planning.approve')->name('mes.orders.status');
    Route::post('mes/trace/{container}/split', [MesP0Controller::class, 'split'])->middleware('permission:traceability.write')->name('mes.trace.split');
    Route::post('mes/trace/merge', [MesP0Controller::class, 'merge'])->middleware('permission:traceability.write')->name('mes.trace.merge');
    Route::post('mes/quality/inspections', [MesP0Controller::class, 'inspectQuality'])->middleware('permission:quality.write')->name('mes.quality.inspect');
    Route::patch('mes/quality/inspections/{inspection}/disposition', [MesP0Controller::class, 'disposeQuality'])->middleware('permission:quality.approve')->name('mes.quality.dispose');
    Route::post('mes/environment/readings', [MesP0Controller::class, 'recordEnvironment'])->middleware('permission:environment.write')->name('mes.environment.record');
    Route::patch('mes/environment/readings/{reading}/acknowledge', [MesP0Controller::class, 'acknowledgeEnvironment'])->middleware('permission:environment.approve')->name('mes.environment.acknowledge');
    Route::post('mes/biosecurity/events', [MesP0Controller::class, 'reportBiosecurity'])->middleware('permission:biosecurity.write')->name('mes.biosecurity.store');
    Route::patch('mes/biosecurity/events/{event}/close', [MesP0Controller::class, 'closeBiosecurity'])->middleware('permission:biosecurity.approve')->name('mes.biosecurity.close');
    Route::post('mes/mass-balance/{order}', [MesP0Controller::class, 'closeMassBalance'])->middleware('permission:production.approve')->name('mes.mass-balance.close');
    Route::post('mes/continuity/backup', [MesP0Controller::class, 'runBackup'])->middleware('permission:continuity.admin')->name('mes.continuity.backup');
    Route::post('mes/feeding', [MesPhaseOneController::class, 'recordFeeding'])->middleware('permission:production.write')->name('mes.feeding.store');
    Route::post('mes/quality/deviations', [MesPhaseOneController::class, 'createDeviation'])->middleware('permission:quality.write')->name('mes.quality.deviations.store');
    Route::patch('mes/quality/deviations/{deviation}/close', [MesPhaseOneController::class, 'closeDeviation'])->middleware('permission:quality.approve')->name('mes.quality.deviations.close');
    Route::post('mes/maintenance/assets', [MesPhaseOneController::class, 'createAsset'])->middleware('permission:maintenance.write')->name('mes.maintenance.assets.store');
    Route::post('mes/maintenance/work-orders', [MesPhaseOneController::class, 'createWorkOrder'])->middleware('permission:maintenance.write')->name('mes.maintenance.orders.store');
    Route::patch('mes/maintenance/work-orders/{workOrder}/complete', [MesPhaseOneController::class, 'completeWorkOrder'])->middleware('permission:maintenance.approve')->name('mes.maintenance.orders.complete');
    Route::post('mes/performance/downtimes', [MesIndustrialController::class, 'openDowntime'])->middleware('permission:performance.write')->name('mes.performance.downtimes.store');
    Route::patch('mes/performance/downtimes/{downtime}/close', [MesIndustrialController::class, 'closeDowntime'])->middleware('permission:performance.write')->name('mes.performance.downtimes.close');
    Route::post('mes/performance/oee', [MesIndustrialController::class, 'recordOee'])->middleware('permission:performance.write')->name('mes.performance.oee.store');
    Route::post('mes/quality/certificates', [MesIndustrialController::class, 'createCertificate'])->middleware('permission:quality.write')->name('mes.quality.certificates.store');
    Route::patch('mes/quality/certificates/{certificate}/approve', [MesIndustrialController::class, 'approveCertificate'])->middleware('permission:quality.approve')->name('mes.quality.certificates.approve');
    Route::post('mes/quality/retention-samples', [MesIndustrialController::class, 'retainSample'])->middleware('permission:quality.write')->name('mes.quality.retention.store');
    Route::post('mes/maintenance/spare-parts', [MesIndustrialController::class, 'createSparePart'])->middleware('permission:maintenance.write')->name('mes.maintenance.spares.store');
    Route::post('mes/maintenance/spare-parts/consume', [MesIndustrialController::class, 'consumeSparePart'])->middleware('permission:maintenance.write')->name('mes.maintenance.spares.consume');
    Route::post('mes/quality/laboratory-methods', [MesAdvancedController::class, 'createLaboratoryMethod'])->middleware('permission:laboratory.approve')->name('mes.quality.lab-methods.store');
    Route::post('mes/quality/laboratory-samples', [MesAdvancedController::class, 'createLaboratorySample'])->middleware('permission:laboratory.write')->name('mes.quality.lab-samples.store');
    Route::post('mes/quality/laboratory-results', [MesAdvancedController::class, 'recordLaboratoryResult'])->middleware('permission:laboratory.write')->name('mes.quality.lab-results.store');
    Route::post('mes/maintenance/condition-readings', [MesAdvancedController::class, 'recordConditionReading'])->middleware('permission:maintenance.write')->name('mes.maintenance.condition.store');
    Route::post('mes/users', [UserAdministrationController::class, 'store'])->middleware('permission:users.manage')->name('mes.users.store');
    Route::patch('mes/users/{user}', [UserAdministrationController::class, 'update'])->middleware('permission:users.manage')->name('mes.users.update');
});

require __DIR__.'/settings.php';
