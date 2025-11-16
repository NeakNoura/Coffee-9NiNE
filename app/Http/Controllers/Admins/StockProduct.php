<?php
namespace App\Http\Controllers\Admins;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product\Product;
use App\Exports\SalesReportExport;
use App\Models\Product\Order;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use App\Models\RawMaterial;


class StockProduct extends Controller
{
  public function index()
    {
        $rawMaterials = RawMaterial::all();
        return view('admins.stock', compact('rawMaterials'));
    }

 public function update(Request $request, $id)
{
    $request->validate([
        'quantity' => 'required|numeric|min:0',
    ]);

    $material = RawMaterial::findOrFail($id);
    $material->quantity = $request->quantity;
    $material->save();

    // Return JSON for AJAX
    if($request->ajax()){
        return response()->json([
            'success' => true,
            'new_quantity' => $material->quantity
        ]);
    }

    return redirect()->back()->with('success', 'Stock updated successfully!');
}



public function salesReport()
{
    $sales = DB::table('orders')
        ->select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(quantity) as total_orders'), // sum quantities, not count rows
            DB::raw('SUM(price) as total_sales')
        )
        ->where('created_at', '>=', now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date', 'desc')
        ->get();

    return view('admins.sales', compact('sales'));
}
public function lowStock()
{
    $allProducts = Product::with('rawMaterials')->get();

   foreach ($allProducts as $product) {

    $product->missingRawMaterials = false;

    $sizes = ['S', 'M', 'L'];
    foreach ($sizes as $size) {
        $stocks = $product->rawMaterials->map(function ($mat) use ($size, &$product) {
            if ($mat->quantity < $mat->pivot->quantity_required) {
                $product->missingRawMaterials = true;
            }
            return $mat->pivot->quantity_required > 0
                ? floor($mat->quantity / $mat->pivot->quantity_required)
                : 0;
        });

        $key = 'available_' . strtolower($size);
        $product->$key = $stocks->min() ?? 0;
    }

    $product->available_stock = min($product->available_s, $product->available_m, $product->available_l);
}

    return view('admins.low_stock', compact('allProducts'));
}

public function addQuantity(Request $request, $id)
{
    $request->validate([
        'quantity' => 'required|integer|min:1',
    ]);

    $product = Product::with('rawMaterials')->findOrFail($id);

    // If no raw materials assigned
    if ($product->rawMaterials->isEmpty()) {
        return response()->json([
            'success' => false,
            'missingRawMaterials' => true,
            'message' => 'You need to assign raw materials first!'
        ]);
    }

    $product->missingRawMaterials = false;

    // Update raw materials
    foreach ($product->rawMaterials as $material) {
        if ($material->pivot->quantity_required > 0) {
            $material->quantity += $request->quantity * $material->pivot->quantity_required;
            $material->save();
        }
    }

    // Recalculate available stock per size
    $sizes = ['S', 'M', 'L'];
    foreach ($sizes as $size) {
        $stocks = $product->rawMaterials->map(function ($mat) use ($size, &$product) {
            if ($mat->quantity < $mat->pivot->quantity_required) {
                $product->missingRawMaterials = true;
            }
            return $mat->pivot->quantity_required > 0
                ? floor($mat->quantity / $mat->pivot->quantity_required)
                : 0;
        });

        $key = 'available_' . strtolower($size);
        $product->$key = $stocks->min() ?? 0;
    }

    $product->available_stock = min($product->available_s, $product->available_m, $product->available_l);

    return response()->json([
        'success' => true,
        'new_quantity_s' => $product->available_s,
        'new_quantity_m' => $product->available_m,
        'new_quantity_l' => $product->available_l,
        'missingRawMaterials' => $product->missingRawMaterials,
        'message' => $product->name . ' stock updated!',
    ]);
}





}
