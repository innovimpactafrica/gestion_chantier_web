export interface VideoPromo {
    id: number;
    libelle: string;
    description: string;
    profil: string;
    link: string;
}

export interface VideoPromoResponse {
    content: VideoPromo[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}