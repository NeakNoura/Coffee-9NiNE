<?php

namespace App\Http\Controllers\Admins;

use App\Models\Product\Product;
use App\Models\ProductType;
use App\Models\SubType;
use App\Models\Product\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Controller;

class StaffController extends Controller
{

    public function StaffSellForm()
{
    $products = Product::with('type', 'subType', 'rawMaterials')->orderBy('id','asc')->get();

    foreach ($products as $product) {
        $product->missingRawMaterials = $product->hasMissingRawMaterials();

        $sizes = ['S','M','L'];
        foreach ($sizes as $size) {
            $key = 'available_' . strtolower($size);
            $product->$key = $product->getAvailableStockBySize($size);
        }

        // Optional: overall stock (minimum of all sizes)
        $product->available_stock = min($product->available_s, $product->available_m, $product->available_l);
    }

    $productsType = $products->groupBy(fn($p) => strtolower($p->type->name ?? 'others'));
    $types = ProductType::all();
    $subTypes = SubType::all();
    $earning = Order::sum('price');

    return view('admins.staffSell', compact('products', 'productsType', 'types', 'subTypes', 'earning'));
}

public function staffCheckout(Request $request)
{
    $cart = json_decode($request->cart_data, true);
    $paymentMethod = $request->payment_method ?? 'Cash';

    if (empty($cart) || !is_array($cart)) {
        return response()->json([
            'success' => false,
            'message' => 'Cart is empty or invalid!'
        ]);
    }

    $updatedStock = [];
    $totalAmount = 0;

    DB::beginTransaction();

    try {
        foreach ($cart as $item) {
            $product = Product::with('rawMaterials')->find($item['id']);
            if (!$product) continue;

            // 1️⃣ Determine requested size and quantity
            $size = strtoupper($item['size'] ?? 'S');
            $quantity = intval($item['quantity']);

            // 2️⃣ Check available stock using model method
            $availableForSize = $product->getAvailableStockBySize($size);
            if ($quantity > $availableForSize) {
                throw new \Exception("Not enough stock for {$product->name} ({$size})");
            }

            // 3️⃣ Deduct raw materials for the chosen size
            foreach ($product->rawMaterials as $material) {
                $pivot = $material->pivot;
                if (!$pivot || strtoupper(trim($pivot->size)) !== $size) continue;

                $requiredQty = $pivot->quantity_required * $quantity;

                if ($material->quantity < $requiredQty) {
                    throw new \Exception("Not enough {$material->name} for {$product->name} ({$size})");
                }

                $material->decrement('quantity', $requiredQty);
            }

            // 4️⃣ Create order
            $lineTotal = $item['unit_price'] * $quantity;
            $product->orders()->create([
                'user_id'        => Auth::id(),
                'product_id'     => $product->id,
                'quantity'       => $quantity,
                'size'           => $size,
                'sugar'          => $item['sugar'] ?? '50',
                'price'          => $lineTotal,
                'status'         => 'Paid Successfully',
                'payment_status' => 'Paid',
                'payment_method' => $paymentMethod,
                'first_name'     => 'Walk-in',
                'last_name'      => 'Customer',
            ]);

            // 5️⃣ Update stock array for frontend
            $updatedStock[$product->id] = [
                'S' => $product->getAvailableStockBySize('S'),
                'M' => $product->getAvailableStockBySize('M'),
                'L' => $product->getAvailableStockBySize('L'),
            ];

            $totalAmount += $lineTotal;
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Checkout successful!',
            'updated_stock' => $updatedStock,
            'total_amount' => $totalAmount
        ]);

    } catch (\Exception $e) {
        DB::rollBack();

        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}


}
