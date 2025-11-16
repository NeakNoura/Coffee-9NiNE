@extends('layouts.admin')

@section('content')
<div class="container py-5">

    {{-- Back Button --}}
    <div class="mb-4">
        <a href="javascript:history.back()" class="btn btn-outline-dark fw-bold">
            <i class="bi bi-arrow-left-circle"></i> Back
        </a>
    </div>

    {{-- Inventory Card --}}
    <div class="card shadow-lg border-0 rounded-4 overflow-hidden" style="background-color:#f8f9fa;">
        <div class="card-header py-3 text-white fw-bold" style="background-color:#db770c;">
            <h4 class="mb-0">🧾 Inventory Overview</h4>
        </div>

        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover align-middle text-center mb-0">
                    <thead class="text-white" style="background-color:#6b4c3b;">
                        <tr>
                            <th>#</th>
                            <th>Product Name</th>
                            <th>Available S</th>
                            <th>Available M</th>
                            <th>Available L</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse ($allProducts as $product)
                        <tr>
                            <td>{{ $loop->iteration }}</td>
                            <td>{{ $product->name }}</td>
                            <td id="qty-s-{{ $product->id }}">{{ $product->available_s }}</td>
                            <td id="qty-m-{{ $product->id }}">{{ $product->available_m }}</td>
                            <td id="qty-l-{{ $product->id }}">{{ $product->available_l }}</td>
                            <td>
                                <span id="status-{{ $product->id }}" class="badge rounded-pill {{ $product->available_stock <= 5 ? 'bg-danger' : 'bg-success' }}">
                                    {{ $product->available_stock <= 5 ? 'Low' : 'OK' }}
                                </span>
                            </td>
                            <td>
                                @if ($product->missingRawMaterials)
                                    <span class="text-warning fw-bold">Missing Raw Materials!</span>
                                @else
                                    <button class="btn btn-sm btn-outline-success btn-add-quantity"
                                            data-id="{{ $product->id }}"
                                            data-name="{{ $product->name }}">
                                        + Add
                                    </button>
                                @endif
                            </td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="7" class="text-center">No products found</td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<link rel="stylesheet" href="{{ asset('assets/css/inventory.css') }}">
<meta name="csrf-token" content="{{ csrf_token() }}">
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="{{ asset('assets/js/low_stock.js') }}"></script>
@endsection
