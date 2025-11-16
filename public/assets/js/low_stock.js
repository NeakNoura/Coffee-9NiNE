document.addEventListener('DOMContentLoaded', function() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    const lowStockThreshold = 5;

    document.querySelector('table tbody').addEventListener('click', async function(e) {
        const btn = e.target.closest('.btn-add-quantity');
        if (!btn) return;

        const productId = btn.dataset.id;
        const productName = btn.dataset.name;

      const { value: qtyToAdd, isConfirmed } = await Swal.fire({
    title: `Add Quantity to ${productName}`,
    input: 'number',
    inputAttributes: { min: 1 },
    inputPlaceholder: 'Enter quantity to add',
    showCancelButton: true,
    confirmButtonText: 'Add',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#db770c', // orange
    cancelButtonColor: '#6c757d', // gray
    background: '#f8f9fa',
    color: '#000'
});

        if (!isConfirmed) return;

        const qty = parseInt(qtyToAdd);
        if (isNaN(qty) || qty <= 0) {
            Swal.fire('Error', 'Please enter a valid quantity', 'error');
            return;
        }

        try {
            const res = await fetch(`/admin/products/${productId}/add-quantity`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ quantity: qty })
            });

            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data?.message || 'Something went wrong');

            // **Check missing raw materials before updating DOM**
            if (data.missingRawMaterials) {
                Swal.fire('Cannot Add', data.message, 'warning');
                return; // stop execution
            }

            // Update quantities in table
            const qtySEl = document.getElementById(`qty-s-${productId}`);
            const qtyMEl = document.getElementById(`qty-m-${productId}`);
            const qtyLEl = document.getElementById(`qty-l-${productId}`);
            if (qtySEl) qtySEl.textContent = data.new_quantity_s;
            if (qtyMEl) qtyMEl.textContent = data.new_quantity_m;
            if (qtyLEl) qtyLEl.textContent = data.new_quantity_l;

            // Update status badge
            const statusEl = document.getElementById(`status-${productId}`);
            const minStock = Math.min(data.new_quantity_s, data.new_quantity_m, data.new_quantity_l);
            if (statusEl) {
                if (minStock <= lowStockThreshold) {
                    statusEl.textContent = 'Low';
                    statusEl.className = 'badge rounded-pill bg-danger';
                } else {
                    statusEl.textContent = 'OK';
                    statusEl.className = 'badge rounded-pill bg-success';
                }
            }

            // Hide +Add button if stock is OK
            if (btn) btn.style.display = (minStock > lowStockThreshold) ? 'none' : 'inline-block';

            Swal.fire('Success', data.message, 'success');

        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    });
});
