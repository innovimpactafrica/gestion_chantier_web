import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FileDownloadService {

    private fileBaseUrl = environment.filebaseUrl;

    /**
     * Construit l'URL complète d'un fichier à partir de son nom/chemin relatif.
     */
    buildUrl(filePath: string): string {
        if (!filePath) return '';
        return filePath.startsWith('http') ? filePath : `${this.fileBaseUrl}${filePath}`;
    }

    /**
     * Télécharge un fichier directement sur l'appareil (fetch + blob).
     * L'URL du fichier n'est jamais exposée dans la barre d'adresse du navigateur.
     *
     * @param filePath  - Nom ou chemin relatif du fichier (ex: "uuid.png")
     * @param fileName  - Nom du fichier à afficher lors du téléchargement
     */
    downloadFile(filePath: string, fileName?: string): void {
        if (!filePath) return;

        const fullUrl = this.buildUrl(filePath);
        const safeName = fileName || filePath.split('/').pop() || 'document';

        fetch(fullUrl)
            .then(res => {
                if (!res.ok) throw new Error(`Erreur réseau : ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = safeName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(objectUrl);
            })
            .catch(err => {
                console.error('Erreur lors du téléchargement :', err);
                // Fallback : ouvrir dans un nouvel onglet
                window.open(fullUrl, '_blank');
            });
    }

    /**
     * Génère un nom de fichier propre à partir du libellé et du filePath.
     * Ex: libellé="Plan façade" + filePath="uuid.png" → "Plan_facade.png"
     */
    buildSafeName(filePath: string, libelle?: string): string {
        const rawName = filePath.split('/').pop() || 'document';
        const ext = rawName.includes('.') ? '.' + rawName.split('.').pop() : '';
        return libelle
            ? libelle.replace(/[^a-z0-9_\-\.]/gi, '_') + ext
            : rawName;
    }
}
