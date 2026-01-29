import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, SafeHtml, SafeUrl } from '@angular/platform-browser';

@Pipe({
    name: 'sanitize',
    standalone: true
})
export class SanitizePipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) { }

    transform(value: string, type: 'html' | 'resourceUrl' | 'url'): SafeHtml | SafeResourceUrl | SafeUrl {
        switch (type) {
            case 'html':
                return this.sanitizer.bypassSecurityTrustHtml(value);
            case 'resourceUrl':
                return this.sanitizer.bypassSecurityTrustResourceUrl(value);
            case 'url':
                return this.sanitizer.bypassSecurityTrustUrl(value);
            default:
                return this.sanitizer.bypassSecurityTrustHtml(value);
        }
    }
}