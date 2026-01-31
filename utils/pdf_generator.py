"""
Générateur de PDF simple et robuste pour les fiches métiers.
"""
from datetime import datetime
from pathlib import Path
from typing import Optional
from fpdf import FPDF
from database.models import FicheMetier, VarianteFiche


class FichePDF(FPDF):
    """Classe pour générer des PDFs simples de fiches métiers."""

    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(20, 20, 20)  # Marges larges pour éviter les problèmes

    def header(self):
        """En-tête du PDF."""
        self.set_fill_color(74, 57, 192)
        self.rect(0, 0, 210, 20, 'F')

        self.set_y(6)
        self.set_font('Arial', 'B', 20)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, 'FICHE METIER', 0, 1, 'C')
        self.ln(8)

    def footer(self):
        """Pied de page du PDF."""
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f'Page {self.page_no()} - {datetime.now().strftime("%d/%m/%Y")}', 0, 0, 'C')

    def section_title(self, title: str):
        """Ajoute un titre de section."""
        self.ln(3)
        self.set_font('Arial', 'B', 12)
        self.set_text_color(74, 57, 192)
        self.cell(0, 8, title, 0, 1)
        self.set_text_color(0, 0, 0)
        self.ln(1)

    def add_text(self, text: str):
        """Ajoute un bloc de texte."""
        self.set_font('Arial', '', 10)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def add_list(self, items: list):
        """Ajoute une liste simple."""
        self.set_font('Arial', '', 10)
        for item in items:
            item_text = item.encode('latin-1', 'replace').decode('latin-1')
            self.multi_cell(0, 5, f'  - {item_text}')
        self.ln(2)


def generer_pdf_fiche(fiche: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """
    Génère un PDF simple pour une fiche métier.
    """
    pdf = FichePDF()
    pdf.add_page()

    # Titre
    pdf.set_font('Arial', 'B', 18)
    pdf.set_text_color(26, 26, 46)
    pdf.cell(0, 10, fiche.nom_masculin, 0, 1, 'C')
    pdf.ln(2)

    # Infos de base
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, f'Code ROME: {fiche.code_rome}', 0, 1, 'C')
    pdf.cell(0, 5, f'Statut: {fiche.metadata.statut.value.replace("_", " ").title()}', 0, 1, 'C')
    pdf.ln(3)

    # Appellations
    pdf.section_title('APPELLATIONS')
    pdf.add_text(f'Masculin: {fiche.nom_masculin}')
    pdf.add_text(f'Feminin: {fiche.nom_feminin}')
    pdf.add_text(f'Epicene: {fiche.nom_epicene}')

    # Description
    if fiche.description:
        pdf.section_title('DESCRIPTION')
        pdf.add_text(fiche.description)
        if fiche.description_courte:
            pdf.set_font('Arial', 'I', 9)
            pdf.set_text_color(100, 100, 100)
            pdf.multi_cell(0, 5, fiche.description_courte)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

    # Compétences techniques
    if fiche.competences:
        pdf.section_title('COMPETENCES TECHNIQUES')
        pdf.add_list(fiche.competences)

    # Compétences transversales
    if fiche.competences_transversales:
        pdf.section_title('COMPETENCES TRANSVERSALES')
        pdf.add_list(fiche.competences_transversales)

    # Formations
    if fiche.formations:
        pdf.section_title('FORMATIONS')
        pdf.add_list(fiche.formations)

    # Certifications
    if fiche.certifications:
        pdf.section_title('CERTIFICATIONS')
        pdf.add_list(fiche.certifications)

    # Salaires (texte simple, pas de tableau)
    if fiche.salaires and (fiche.salaires.junior.median or fiche.salaires.confirme.median or fiche.salaires.senior.median):
        pdf.section_title('REMUNERATION (brut annuel)')

        if fiche.salaires.junior.median:
            min_txt = f'{fiche.salaires.junior.min:,} EUR' if fiche.salaires.junior.min else 'N/A'
            med_txt = f'{fiche.salaires.junior.median:,} EUR'
            max_txt = f'{fiche.salaires.junior.max:,} EUR' if fiche.salaires.junior.max else 'N/A'
            pdf.add_text(f'Junior (0-2 ans): {min_txt} - {med_txt} - {max_txt}')

        if fiche.salaires.confirme.median:
            min_txt = f'{fiche.salaires.confirme.min:,} EUR' if fiche.salaires.confirme.min else 'N/A'
            med_txt = f'{fiche.salaires.confirme.median:,} EUR'
            max_txt = f'{fiche.salaires.confirme.max:,} EUR' if fiche.salaires.confirme.max else 'N/A'
            pdf.add_text(f'Confirme (3-7 ans): {min_txt} - {med_txt} - {max_txt}')

        if fiche.salaires.senior.median:
            min_txt = f'{fiche.salaires.senior.min:,} EUR' if fiche.salaires.senior.min else 'N/A'
            med_txt = f'{fiche.salaires.senior.median:,} EUR'
            max_txt = f'{fiche.salaires.senior.max:,} EUR' if fiche.salaires.senior.max else 'N/A'
            pdf.add_text(f'Senior (8+ ans): {min_txt} - {med_txt} - {max_txt}')

        if fiche.salaires.source:
            pdf.set_font('Arial', 'I', 8)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 5, f'Source: {fiche.salaires.source}', 0, 1)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

    # Perspectives
    if fiche.perspectives:
        pdf.section_title('PERSPECTIVES D\'EMPLOI')

        info_parts = [f'Tendance: {fiche.perspectives.tendance.value.title()}']
        if fiche.perspectives.tension:
            info_parts.append(f'Tension: {fiche.perspectives.tension:.0%}')
        if fiche.perspectives.nombre_offres:
            info_parts.append(f'Offres: {fiche.perspectives.nombre_offres}')
        if fiche.perspectives.taux_insertion:
            info_parts.append(f'Insertion: {fiche.perspectives.taux_insertion:.0%}')

        pdf.add_text(' | '.join(info_parts))

        if fiche.perspectives.evolution_5ans:
            pdf.add_text(fiche.perspectives.evolution_5ans)

    # Conditions de travail
    if fiche.conditions_travail:
        pdf.section_title('CONDITIONS DE TRAVAIL')
        pdf.add_list(fiche.conditions_travail)

    # Environnements
    if fiche.environnements:
        pdf.section_title('ENVIRONNEMENTS')
        pdf.add_list(fiche.environnements)

    # Métadonnées
    pdf.ln(3)
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(120, 120, 120)
    meta_text = (
        f'Version {fiche.metadata.version} | '
        f'Source: {fiche.metadata.source} | '
        f'MAJ: {fiche.metadata.date_maj.strftime("%d/%m/%Y")}'
    )
    pdf.cell(0, 5, meta_text, 0, 1, 'C')

    # Générer
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return bytes(pdf.output())


def generer_pdf_variante(variante: VarianteFiche, fiche_originale: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """
    Génère un PDF simple pour une variante.
    """
    pdf = FichePDF()
    pdf.add_page()

    # Titre
    pdf.set_font('Arial', 'B', 18)
    pdf.set_text_color(26, 26, 46)
    pdf.cell(0, 10, variante.nom, 0, 1, 'C')
    pdf.ln(2)

    # Infos variante
    langue_labels = {'fr': 'Francais', 'en': 'English', 'es': 'Espanol', 'de': 'Deutsch', 'it': 'Italiano'}
    age_labels = {'11-15': '11-15 ans', '15-18': '15-18 ans', '18+': 'Adultes'}
    format_labels = {'standard': 'Standard', 'falc': 'FALC'}
    genre_labels = {'masculin': 'Masculin', 'feminin': 'Feminin', 'epicene': 'Epicene'}

    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, f'Code ROME: {variante.code_rome}', 0, 1, 'C')
    pdf.cell(0, 5, f'Langue: {langue_labels.get(variante.langue.value, variante.langue.value)}', 0, 1, 'C')

    info_line = (
        f'Public: {age_labels.get(variante.tranche_age.value, variante.tranche_age.value)} | '
        f'Format: {format_labels.get(variante.format_contenu.value, variante.format_contenu.value)} | '
        f'Genre: {genre_labels.get(variante.genre.value, variante.genre.value)}'
    )
    pdf.cell(0, 5, info_line, 0, 1, 'C')
    pdf.ln(3)

    # Description
    if variante.description:
        pdf.section_title('DESCRIPTION')
        pdf.add_text(variante.description)
        if variante.description_courte:
            pdf.set_font('Arial', 'I', 9)
            pdf.set_text_color(100, 100, 100)
            pdf.multi_cell(0, 5, variante.description_courte)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(2)

    # Compétences
    if variante.competences:
        pdf.section_title('COMPETENCES TECHNIQUES')
        pdf.add_list(variante.competences)

    if variante.competences_transversales:
        pdf.section_title('COMPETENCES TRANSVERSALES')
        pdf.add_list(variante.competences_transversales)

    # Formations
    if variante.formations:
        pdf.section_title('FORMATIONS')
        pdf.add_list(variante.formations)

    if variante.certifications:
        pdf.section_title('CERTIFICATIONS')
        pdf.add_list(variante.certifications)

    # Salaires (depuis fiche originale)
    if fiche_originale.salaires and (fiche_originale.salaires.junior.median or fiche_originale.salaires.confirme.median or fiche_originale.salaires.senior.median):
        pdf.section_title('REMUNERATION (brut annuel)')

        if fiche_originale.salaires.junior.median:
            pdf.add_text(f'Junior: {fiche_originale.salaires.junior.median:,} EUR')
        if fiche_originale.salaires.confirme.median:
            pdf.add_text(f'Confirme: {fiche_originale.salaires.confirme.median:,} EUR')
        if fiche_originale.salaires.senior.median:
            pdf.add_text(f'Senior: {fiche_originale.salaires.senior.median:,} EUR')

    # Perspectives
    if fiche_originale.perspectives:
        pdf.section_title('PERSPECTIVES D\'EMPLOI')

        info_parts = [f'Tendance: {fiche_originale.perspectives.tendance.value.title()}']
        if fiche_originale.perspectives.tension:
            info_parts.append(f'Tension: {fiche_originale.perspectives.tension:.0%}')

        pdf.add_text(' | '.join(info_parts))

    # Conditions
    if variante.conditions_travail:
        pdf.section_title('CONDITIONS DE TRAVAIL')
        pdf.add_list(variante.conditions_travail)

    if variante.environnements:
        pdf.section_title('ENVIRONNEMENTS')
        pdf.add_list(variante.environnements)

    # Métadonnées
    pdf.ln(3)
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 5, f'Version {variante.version} | MAJ: {variante.date_maj.strftime("%d/%m/%Y")}', 0, 1, 'C')

    # Générer
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return bytes(pdf.output())
