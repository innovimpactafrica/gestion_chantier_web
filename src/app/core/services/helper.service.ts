import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface InvoiceData {
    invoiceNumber: string;
    createdAt: string;
    amount: number;
    paid: boolean;
    planLabel?: string;
    user?: {
        prenom?: string;
        nom?: string;
        email?: string;
        telephone?: string;
        adress?: string;
        company?: {
            name?: string;
        };
    };
}

@Injectable({
    providedIn: 'root'
})
export class HelperService {

    constructor() { }

    /**
     * Télécharge une facture au format PDF
     * @param invoice - Données de la facture
     */
    telechargerFacturePDF(invoice: InvoiceData): void {
        const html = this.construireHTMLFacture(invoice);

        // Créer un conteneur caché
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-99999px';
        container.style.width = '794px'; // ≈ 210mm pour taille A4
        container.style.padding = '20px';
        container.style.background = '#ffffff';
        container.innerHTML = html;
        document.body.appendChild(container);

        // Injecter Tailwind
        const style = document.createElement('link');
        style.rel = 'stylesheet';
        style.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
        container.appendChild(style);

        // Attendre le chargement du style
        style.onload = () => {
            (html2canvas as any)(container, {
                scale: 2, // Meilleure qualité du PDF
                useCORS: true // Utile si images
            }).then((canvas: HTMLCanvasElement) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');

                // Calcul taille automatiquement
                const imgWidth = 210;
                const pageHeight = 297;
                let imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                // Gestion multi-pages si contenu dépasse une page
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                pdf.save(`facture-${invoice.invoiceNumber}.pdf`);
                document.body.removeChild(container);
            });
        };
    }

    /**
     * Construit le HTML de la facture
     * @param invoice - Données de la facture
     * @returns HTML formaté
     */
    private construireHTMLFacture(invoice: InvoiceData): string {
        const formatDate = (date: string) =>
            new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

        const formatAmount = (amount: number) =>
            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

        const sousTotal = invoice.amount || 0;
        const tva = sousTotal * 0.18;
        const totalTTC = sousTotal + tva;

        return `
        <div class="min-h-screen bg-white p-10">
          <div class="max-w-4xl mx-auto">
            <!-- Bande orange -->
            <div class="bg-gradient-to-r from-[#FF5C02] to-[#FF7A33] h-3 rounded-t-lg"></div>
   
            <div class="border-2 border-gray-200 rounded-b-lg p-12 bg-white">
              <!-- Header -->
              <div class="flex justify-between items-start mb-12 pb-8 border-b-2 border-gray-100">
                <div class="flex items-center gap-6">
                  <div class="w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
    <img src="assets/images/btp.png" alt="Logo BTP" class="w-full h-full object-cover" crossOrigin="anonymous">
  </div>
   
                  <div>
                    <h1 class="text-3xl font-bold">BTP</h1>
                    <p class="text-gray-600">La solution complète</p>
                    <p class="text-sm text-gray-500">Dakar, Sénégal • contact@BTP.sn</p>
                  </div>
                </div>
   
                <div class="text-right">
                  <div class="inline-block bg-[#FF5C02] text-white px-4 py-2 rounded-lg mb-4">
                    <p class="text-sm font-medium">FACTURE</p>
                  </div>
                  <p class="text-2xl font-bold">${invoice.invoiceNumber}</p>
                  <p class="text-sm text-gray-600">Date d'émission : ${formatDate(invoice.createdAt)}</p>
                  ${invoice.paid
                ? `<span class="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">PAYÉE</span>`
                : `<span class="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">EN ATTENTE</span>`}
                </div>
              </div>
   
              <!-- Client -->
              <div class="mb-12">
                <h2 class="text-lg font-semibold mb-4">Facturé à</h2>
                <div class="bg-gray-50 p-6 rounded-xl border">
                  <p class="text-xl font-bold">${invoice.user?.prenom || ''} ${invoice.user?.nom || ''}</p>
                  ${invoice.user?.company?.name ? `<p class="font-medium mt-2">${invoice.user.company.name}</p>` : ''}
                  <div class="text-sm text-gray-600 mt-3 space-y-1">
                    <p>${invoice.user?.email || ''}</p>
                    <p>${invoice.user?.telephone || ''}</p>
                    <p>${invoice.user?.adress || ''}</p>
                  </div>
                </div>
              </div>
   
              <!-- Tableau abonnement -->
              <div class="mb-8">
                <h2 class="text-lg font-semibold mb-4">Détails de l'abonnement</h2>
                <table class="w-full border-collapse">
                  <thead>
                    <tr class="bg-gradient-to-r from-[#FF5C02] to-[#FF7A33] text-white">
                      <th class="text-left p-4">Description</th>
                      <th class="text-center p-4">Période</th>
                      <th class="text-right p-4">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="bg-gray-50">
                      <td class="p-5">
                        <span class="font-semibold">${invoice.planLabel || 'Abonnement'}</span><br>
                        <span class="text-sm text-gray-600">Abonnement annuel</span>
                      </td>
                  
                      <td class="text-right p-5 font-semibold">${formatAmount(sousTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
   
              <!-- Résumé -->
              <div class="flex justify-end">
                <div class="w-96 space-y-3">
                  <div class="flex justify-between"><span>Sous-total HT :</span><span>${formatAmount(sousTotal)}</span></div>
                 
                  <div class="border-t-2 border-gray-300 my-2"></div>
                  <div class="flex justify-between text-xl font-bold text-[#FF5C02]">
                    <span>Total TTC :</span>
                    <span>${formatAmount(sousTotal)}</span>
                  </div>
                </div>
              </div>
   
              <!-- Footer -->
              <div class="text-center text-sm text-gray-500 mt-16">
                <p>BTP © 2025 • Document généré électroniquement – Aucune signature requise</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Formate un montant en devise
     * @param amount - Montant à formater
     * @param currency - Code devise (défaut: XOF)
     * @returns Montant formaté
     */
    formatCurrency(amount: number, currency: string = 'XOF'): string {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Formate une date
     * @param date - Date à formater
     * @param format - Format souhaité ('short' | 'long')
     * @returns Date formatée
     */
    formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        if (format === 'long') {
            return dateObj.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        return dateObj.toLocaleDateString('fr-FR');
    }

    /**
     * Télécharge un fichier
     * @param url - URL du fichier
     * @param filename - Nom du fichier
     */
    downloadFile(url: string, filename: string): void {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Copie du texte dans le presse-papiers
     * @param text - Texte à copier
     * @returns Promise<boolean>
     */
    async copyToClipboard(text: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Erreur lors de la copie:', error);
            return false;
        }
    }

    /**
     * Génère un ID unique
     * @returns ID unique
     */
    generateUniqueId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debounce une fonction
     * @param func - Fonction à debouncer
     * @param wait - Délai en ms
     * @returns Fonction debouncée
     */
    debounce<T extends (...args: any[]) => any>(
        func: T,
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: any;
        return (...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
}
