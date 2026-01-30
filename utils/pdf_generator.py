"""
Générateur de PDF pour les fiches métiers.
"""
from datetime import datetime
from pathlib import Path
from typing import Optional
from fpdf import FPDF
from database.models import FicheMetier, VarianteFiche


class FichePDF(FPDF):
    """Classe pour générer des PDFs de fiches métiers."""

    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        """En-tête du PDF."""
        # Logo / Titre
        self.set_font('Arial', 'B', 20)
        self.set_text_color(74, 57, 192)  # Violet principal
        self.cell(0, 10, 'Fiche Metier', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        """Pied de page du PDF."""
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()} - Genere le {datetime.now().strftime("%d/%m/%Y")}', 0, 0, 'C')

    def section_title(self, title: str, icon: str = ""):
        """Ajoute un titre de section."""
        self.set_font('Arial', 'B', 14)
        self.set_text_color(74, 57, 192)
        self.ln(5)
        self.cell(0, 8, f'{icon} {title}', 0, 1)
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def add_text_block(self, text: str):
        """Ajoute un bloc de texte."""
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def add_list_items(self, items: list, bullet: str = "-"):
        """Ajoute une liste à puces."""
        self.set_font('Arial', '', 10)
        for item in items:
            # Encoder correctement pour éviter les erreurs d'encodage
            item_text = item.encode('latin-1', 'replace').decode('latin-1')
            self.cell(5)  # Indentation
            self.multi_cell(0, 5, f'{bullet} {item_text}')
        self.ln(2)

    def add_metadata_box(self, metadata: dict):
        """Ajoute une boîte de métadonnées."""
        self.set_fill_color(249, 248, 255)  # Fond violet clair
        self.set_font('Arial', 'I', 9)
        self.set_text_color(100, 100, 100)

        meta_text = " | ".join([f"{k}: {v}" for k, v in metadata.items()])
        self.multi_cell(0, 5, meta_text, 0, 'L', True)
        self.ln(3)


def generer_pdf_fiche(fiche: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """
    Génère un PDF pour une fiche métier.

    Args:
        fiche: Fiche métier à exporter
        output_path: Chemin de sortie (optionnel, sinon retourne bytes)

    Returns:
        Bytes du PDF si output_path est None
    """
    pdf = FichePDF()
    pdf.add_page()

    # Titre principal
    pdf.set_font('Arial', 'B', 18)
    pdf.set_text_color(26, 26, 46)
    pdf.cell(0, 10, fiche.nom_masculin, 0, 1, 'C')
    pdf.ln(3)

    # Code ROME et statut
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, f'Code ROME: {fiche.code_rome} | Statut: {fiche.metadata.statut.value.title()}', 0, 1, 'C')
    pdf.ln(5)

    # Noms genrés
    pdf.section_title('Appellations', '')
    pdf.set_font('Arial', '', 10)
    pdf.cell(60, 6, f'Masculin: {fiche.nom_masculin}', 0, 0)
    pdf.cell(60, 6, f'Feminin: {fiche.nom_feminin}', 0, 0)
    pdf.cell(60, 6, f'Epicene: {fiche.nom_epicene}', 0, 1)
    pdf.ln(2)

    # Description
    if fiche.description:
        pdf.section_title('Description', '')
        pdf.add_text_block(fiche.description)

    if fiche.description_courte:
        pdf.set_font('Arial', 'I', 10)
        pdf.set_text_color(100, 100, 100)
        pdf.multi_cell(0, 5, fiche.description_courte)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    # Compétences
    if fiche.competences:
        pdf.section_title('Competences techniques', '')
        pdf.add_list_items(fiche.competences)

    if fiche.competences_transversales:
        pdf.section_title('Competences transversales', '')
        pdf.add_list_items(fiche.competences_transversales)

    # Formations
    if fiche.formations:
        pdf.section_title('Formations', '')
        pdf.add_list_items(fiche.formations)

    if fiche.certifications:
        pdf.section_title('Certifications', '')
        pdf.add_list_items(fiche.certifications)

    # Salaires
    if fiche.salaires and (fiche.salaires.junior.median or fiche.salaires.confirme.median or fiche.salaires.senior.median):
        pdf.section_title('Salaires (brut annuel)', '')
        pdf.set_font('Arial', '', 10)

        if fiche.salaires.junior.median:
            pdf.cell(60, 6, f'Junior: {fiche.salaires.junior.median:,} EUR', 0, 0)
        if fiche.salaires.confirme.median:
            pdf.cell(60, 6, f'Confirme: {fiche.salaires.confirme.median:,} EUR', 0, 0)
        if fiche.salaires.senior.median:
            pdf.cell(60, 6, f'Senior: {fiche.salaires.senior.median:,} EUR', 0, 1)
        pdf.ln(2)

    # Perspectives
    if fiche.perspectives:
        pdf.section_title('Perspectives', '')
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 6, f'Tendance: {fiche.perspectives.tendance.value.title()} | Tension: {fiche.perspectives.tension:.0%}', 0, 1)
        if fiche.perspectives.evolution_5ans:
            pdf.add_text_block(fiche.perspectives.evolution_5ans)

    # Conditions de travail
    if fiche.conditions_travail:
        pdf.section_title('Conditions de travail', '')
        pdf.add_list_items(fiche.conditions_travail)

    if fiche.environnements:
        pdf.section_title('Environnements', '')
        pdf.add_list_items(fiche.environnements)

    # Métadonnées
    pdf.ln(5)
    metadata = {
        'Version': fiche.metadata.version,
        'Source': fiche.metadata.source,
        'MAJ': fiche.metadata.date_maj.strftime('%d/%m/%Y')
    }
    pdf.add_metadata_box(metadata)

    # Générer le PDF
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return pdf.output()


def generer_pdf_variante(variante: VarianteFiche, fiche_originale: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """
    Génère un PDF pour une variante de fiche.

    Args:
        variante: Variante à exporter
        fiche_originale: Fiche métier originale (pour les salaires/perspectives)
        output_path: Chemin de sortie (optionnel)

    Returns:
        Bytes du PDF si output_path est None
    """
    pdf = FichePDF()
    pdf.add_page()

    # Titre principal
    pdf.set_font('Arial', 'B', 18)
    pdf.set_text_color(26, 26, 46)
    pdf.cell(0, 10, variante.nom, 0, 1, 'C')
    pdf.ln(3)

    # Informations de la variante
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(100, 100, 100)

    langue_labels = {
        'fr': 'Francais',
        'en': 'English',
        'es': 'Espanol',
        'de': 'Deutsch',
        'it': 'Italiano'
    }

    age_labels = {
        '11-15': '11-15 ans',
        '15-18': '15-18 ans',
        '18+': 'Adultes (18+)'
    }

    format_labels = {
        'standard': 'Standard',
        'falc': 'FALC (Facile a Lire)'
    }

    genre_labels = {
        'masculin': 'Masculin',
        'feminin': 'Feminin',
        'epicene': 'Epicene'
    }

    variante_info = (
        f'Langue: {langue_labels.get(variante.langue.value, variante.langue.value)} | '
        f'Public: {age_labels.get(variante.tranche_age.value, variante.tranche_age.value)} | '
        f'Format: {format_labels.get(variante.format_contenu.value, variante.format_contenu.value)} | '
        f'Genre: {genre_labels.get(variante.genre.value, variante.genre.value)}'
    )
    pdf.multi_cell(0, 5, variante_info, 0, 'C')

    pdf.set_font('Arial', '', 10)
    pdf.cell(0, 5, f'Code ROME: {variante.code_rome}', 0, 1, 'C')
    pdf.ln(5)

    # Description
    if variante.description:
        pdf.section_title('Description', '')
        pdf.add_text_block(variante.description)

    if variante.description_courte:
        pdf.set_font('Arial', 'I', 10)
        pdf.set_text_color(100, 100, 100)
        pdf.multi_cell(0, 5, variante.description_courte)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)

    # Compétences
    if variante.competences:
        pdf.section_title('Competences techniques', '')
        pdf.add_list_items(variante.competences)

    if variante.competences_transversales:
        pdf.section_title('Competences transversales', '')
        pdf.add_list_items(variante.competences_transversales)

    # Formations
    if variante.formations:
        pdf.section_title('Formations', '')
        pdf.add_list_items(variante.formations)

    if variante.certifications:
        pdf.section_title('Certifications', '')
        pdf.add_list_items(variante.certifications)

    # Salaires (depuis la fiche originale)
    if fiche_originale.salaires and (fiche_originale.salaires.junior.median or fiche_originale.salaires.confirme.median or fiche_originale.salaires.senior.median):
        pdf.section_title('Salaires (brut annuel)', '')
        pdf.set_font('Arial', '', 10)

        if fiche_originale.salaires.junior.median:
            pdf.cell(60, 6, f'Junior: {fiche_originale.salaires.junior.median:,} EUR', 0, 0)
        if fiche_originale.salaires.confirme.median:
            pdf.cell(60, 6, f'Confirme: {fiche_originale.salaires.confirme.median:,} EUR', 0, 0)
        if fiche_originale.salaires.senior.median:
            pdf.cell(60, 6, f'Senior: {fiche_originale.salaires.senior.median:,} EUR', 0, 1)
        pdf.ln(2)

    # Perspectives (depuis la fiche originale)
    if fiche_originale.perspectives:
        pdf.section_title('Perspectives', '')
        pdf.set_font('Arial', '', 10)
        pdf.cell(0, 6, f'Tendance: {fiche_originale.perspectives.tendance.value.title()} | Tension: {fiche_originale.perspectives.tension:.0%}', 0, 1)
        if fiche_originale.perspectives.evolution_5ans:
            pdf.add_text_block(fiche_originale.perspectives.evolution_5ans)

    # Conditions de travail
    if variante.conditions_travail:
        pdf.section_title('Conditions de travail', '')
        pdf.add_list_items(variante.conditions_travail)

    if variante.environnements:
        pdf.section_title('Environnements', '')
        pdf.add_list_items(variante.environnements)

    # Métadonnées
    pdf.ln(5)
    metadata = {
        'Version': variante.version,
        'MAJ': variante.date_maj.strftime('%d/%m/%Y')
    }
    pdf.add_metadata_box(metadata)

    # Générer le PDF
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return pdf.output()
