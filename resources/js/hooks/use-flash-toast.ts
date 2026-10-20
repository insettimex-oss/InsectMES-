import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import Swal, { type SweetAlertIcon } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            void Swal.fire({
                toast: true,
                position: 'top-end',
                icon: data.type as SweetAlertIcon,
                title: data.message,
                showConfirmButton: false,
                timer: 3400,
                timerProgressBar: true,
                width: '22rem',
                padding: '0.8rem 1rem',
                customClass: {
                    popup: 'mes-swal-toast',
                    title: 'mes-swal-title',
                    timerProgressBar: 'mes-swal-progress',
                },
            });
        });
    }, []);
}
