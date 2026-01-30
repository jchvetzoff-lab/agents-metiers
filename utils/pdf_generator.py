"""
Générateur de PDF professionnel pour les fiches métiers.
"""
from datetime import datetime
from pathlib import Path
from typing import Optional
from fpdf import FPDF
from database.models import FicheMetier, VarianteFiche


class FichePDF(FPDF):
    """Classe pour générer des PDFs professionnels de fiches métiers."""

    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)
        self.set_margins(15, 15, 15)

    def header(self):
        """En-tête du PDF avec bannière."""
        # Bannière violette
        self.set_fill_color(74, 57, 192)
        self.rect(0, 0, 210, 25, 'F')

        # Titre blanc sur bannière
        self.set_y(8)
        self.set_font('Arial', 'B', 24)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, 'FICHE METIER', 0, 1, 'C')

        self.ln(8)

    def footer(self):
        """Pied de page professionnel."""
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f'Page {self.page_no()} - Genere le {datetime.now().strftime("%d/%m/%Y a %H:%M")}', 0, 0, 'C')

    def add_badge(self, text: str, x: int, y: int, color=(74, 57, 192), max_width=None):
        """Ajoute un badge coloré."""
        self.set_xy(x, y)
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)
        self.set_font('Arial', 'B', 9)

        # Calculer la largeur du texte avec limite
        text_width = self.get_string_width(text) + 8
        if max_width and text_width > max_width:
            text_width = max_width
            # Réduire la taille de police si nécessaire
            self.set_font('Arial', 'B', 8)

        self.set_line_width(0)
        self.cell(text_width, 6, text, 0, 0, 'C', True)
        self.set_draw_color(0, 0, 0)
        self.set_line_width(0.2)

    def section_title(self, title: str, icon: str = ""):
        """Ajoute un titre de section avec fond coloré."""
        self.ln(4)

        # Fond violet clair pour le titre
        self.set_fill_color(240, 237, 255)
        self.set_draw_color(74, 57, 192)
        self.set_line_width(0.5)

        self.set_font('Arial', 'B', 13)
        self.set_text_color(74, 57, 192)

        full_title = f'{icon} {title}' if icon else title
        self.cell(0, 9, full_title, 1, 1, 'L', True)

        self.set_draw_color(0, 0, 0)
        self.set_line_width(0.2)
        self.ln(3)

    def add_info_box(self, content: str, bg_color=(249, 248, 255)):
        """Ajoute une boîte d'information avec fond coloré."""
        self.set_fill_color(*bg_color)
        self.set_font('Arial', '', 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 6, content, 0, 'L', True)
        self.ln(2)

    def add_text_block(self, text: str, italic=False):
        """Ajoute un bloc de texte."""
        font_style = 'I' if italic else ''
        self.set_font('Arial', font_style, 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def add_list_items(self, items: list, color=(74, 57, 192)):
        """Ajoute une liste à puces avec puces colorées."""
        self.set_font('Arial', '', 10)
        self.set_text_color(40, 40, 40)

        for item in items:
            # Encoder correctement pour éviter les erreurs
            item_text = item.encode('latin-1', 'replace').decode('latin-1')

            x_start = self.get_x()
            y_start = self.get_y()

            # Puce colorée
            self.set_text_color(*color)
            self.set_font('Arial', 'B', 10)
            self.cell(5, 5, chr(149), 0, 0)  # Puce ronde

            # Texte de l'item
            self.set_text_color(40, 40, 40)
            self.set_font('Arial', '', 10)
            self.set_x(x_start + 7)
            self.multi_cell(0, 5, item_text)

        self.ln(1)

    def add_salary_table(self, salaires):
        """Ajoute un tableau professionnel pour les salaires."""
        self.set_fill_color(74, 57, 192)
        self.set_text_color(255, 255, 255)
        self.set_font('Arial', 'B', 10)

        # En-têtes du tableau (largeurs ajustées pour tenir dans la page)
        col_width = 45
        self.cell(col_width, 8, 'Niveau', 1, 0, 'C', True)
        self.cell(col_width, 8, 'Minimum', 1, 0, 'C', True)
        self.cell(col_width, 8, 'Median', 1, 0, 'C', True)
        self.cell(col_width, 8, 'Maximum', 1, 1, 'C', True)

        # Données
        self.set_font('Arial', '', 9)
        self.set_text_color(40, 40, 40)

        levels = [
            ('Junior (0-2 ans)', salaires.junior),
            ('Confirme (3-7 ans)', salaires.confirme),
            ('Senior (8+ ans)', salaires.senior)
        ]

        fill = False
        for level_name, level_data in levels:
            if level_data.median or level_data.min or level_data.max:
                self.set_fill_color(245, 245, 250) if fill else self.set_fill_color(255, 255, 255)

                self.cell(col_width, 7, level_name, 1, 0, 'L', fill)

                min_val = f'{level_data.min:,.0f} EUR' if level_data.min else '-'
                med_val = f'{level_data.median:,.0f} EUR' if level_data.median else '-'
                max_val = f'{level_data.max:,.0f} EUR' if level_data.max else '-'

                self.cell(col_width, 7, min_val, 1, 0, 'C', fill)
                self.cell(col_width, 7, med_val, 1, 0, 'C', fill)
                self.cell(col_width, 7, max_val, 1, 1, 'C', fill)

                fill = not fill

        if salaires.source:
            self.ln(2)
            self.set_font('Arial', 'I', 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 5, f'Source: {salaires.source}', 0, 1, 'L')

        self.ln(3)

    def add_metadata_footer(self, metadata: dict):
        """Ajoute les métadonnées en pied de section."""
        self.ln(5)
        self.set_draw_color(74, 57, 192)
        self.set_line_width(0.5)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(3)

        self.set_font('Arial', 'I', 9)
        self.set_text_color(100, 100, 100)

        meta_text = " | ".join([f"{k}: {v}" for k, v in metadata.items()])
        self.cell(0, 5, meta_text, 0, 1, 'C')


def generer_pdf_fiche(fiche: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """
    Génère un PDF professionnel pour une fiche métier.

    Args:
        fiche: Fiche métier à exporter
        output_path: Chemin de sortie (optionnel, sinon retourne bytes)

    Returns:
        Bytes du PDF si output_path est None
    """
    pdf = FichePDF()
    pdf.add_page()

    # Titre principal
    pdf.set_font('Arial', 'B', 22)
    pdf.set_text_color(26, 26, 46)
    pdf.cell(0, 12, fiche.nom_masculin, 0, 1, 'C')
    pdf.ln(3)

    # Badges Code ROME et statut (centrés)
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(100, 100, 100)
    badge_text = f'Code ROME: {fiche.code_rome} | Statut: {fiche.metadata.statut.value.replace("_", " ").title()}'
    pdf.cell(0, 6, badge_text, 0, 1, 'C')
    pdf.ln(5)

    # Encadré avec les appellations genrées
    pdf.set_fill_color(240, 247, 255)
    pdf.set_draw_color(74, 57, 192)
    pdf.set_line_width(0.3)

    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(74, 57, 192)
    pdf.cell(0, 7, 'APPELLATIONS', 1, 1, 'C', True)

    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(40, 40, 40)
    pdf.set_fill_color(255, 255, 255)

    pdf.cell(63, 6, f'Masculin: {fiche.nom_masculin}', 1, 0, 'L', True)
    pdf.cell(63, 6, f'Feminin: {fiche.nom_feminin}', 1, 0, 'L', True)
    pdf.cell(62, 6, f'Epicene: {fiche.nom_epicene}', 1, 1, 'L', True)
    pdf.ln(5)

    # Description
    if fiche.description:
        pdf.section_title('DESCRIPTION DU METIER')
        pdf.add_text_block(fiche.description)

        if fiche.description_courte:
            pdf.add_info_box(f'Resume: {fiche.description_courte}', (255, 248, 225))

    # Compétences techniques
    if fiche.competences:
        pdf.section_title('COMPETENCES TECHNIQUES REQUISES', chr(128295))
        pdf.add_list_items(fiche.competences)

    # Compétences transversales
    if fiche.competences_transversales:
        pdf.section_title('COMPETENCES TRANSVERSALES', chr(128101))
        pdf.add_list_items(fiche.competences_transversales, (255, 87, 34))

    # Formations
    if fiche.formations:
        pdf.section_title('FORMATIONS RECOMMANDEES', chr(127891))
        pdf.add_list_items(fiche.formations, (33, 150, 243))

    # Certifications
    if fiche.certifications:
        pdf.section_title('CERTIFICATIONS PROFESSIONNELLES', chr(128196))
        pdf.add_list_items(fiche.certifications, (156, 39, 176))

    # Salaires avec tableau professionnel
    if fiche.salaires and (fiche.salaires.junior.median or fiche.salaires.confirme.median or fiche.salaires.senior.median):
        pdf.section_title('REMUNERATION (brut annuel)', chr(128176))
        pdf.add_salary_table(fiche.salaires)

    # Perspectives d'emploi
    if fiche.perspectives:
        pdf.section_title('PERSPECTIVES D\'EMPLOI', chr(128200))

        # Indicateurs clés dans un encadré
        info_text = f'Tendance du marche: {fiche.perspectives.tendance.value.title()}'
        if fiche.perspectives.tension:
            tension_pct = fiche.perspectives.tension * 100
            info_text += f' | Tension recrutement: {tension_pct:.0f}%'
        if fiche.perspectives.nombre_offres:
            info_text += f' | Offres recentes: {fiche.perspectives.nombre_offres}'
        if fiche.perspectives.taux_insertion:
            insertion_pct = fiche.perspectives.taux_insertion * 100
            info_text += f' | Taux insertion: {insertion_pct:.0f}%'

        pdf.add_info_box(info_text, (232, 245, 233))

        if fiche.perspectives.evolution_5ans:
            pdf.add_text_block(f'Evolution sur 5 ans: {fiche.perspectives.evolution_5ans}')

    # Conditions de travail
    if fiche.conditions_travail:
        pdf.section_title('CONDITIONS DE TRAVAIL', chr(128188))
        pdf.add_list_items(fiche.conditions_travail, (96, 125, 139))

    # Environnements professionnels
    if fiche.environnements:
        pdf.section_title('ENVIRONNEMENTS PROFESSIONNELS', chr(127970))
        pdf.add_list_items(fiche.environnements, (63, 81, 181))

    # Métadonnées en pied de page
    metadata = {
        'Version': fiche.metadata.version,
        'Source': fiche.metadata.source,
        'Date de creation': fiche.metadata.date_creation.strftime('%d/%m/%Y'),
        'Derniere MAJ': fiche.metadata.date_maj.strftime('%d/%m/%Y')
    }
    pdf.add_metadata_footer(metadata)

    # Générer le PDF
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return bytes(pdf.output())


def generer_pdf_variante(variante: VarianteFiche, fiche_originale: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """
    Génère un PDF professionnel pour une variante de fiche.

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
    pdf.set_font('Arial', 'B', 22)
    pdf.set_text_color(26, 26, 46)
    pdf.cell(0, 12, variante.nom, 0, 1, 'C')
    pdf.ln(3)

    # Informations de la variante (texte simple, pas de badges)
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
        '18+': 'Adultes'
    }

    format_labels = {
        'standard': 'Standard',
        'falc': 'FALC'
    }

    genre_labels = {
        'masculin': 'Masculin',
        'feminin': 'Feminin',
        'epicene': 'Epicene'
    }

    # Ligne 1 : Code ROME et Langue
    pdf.set_font('Arial', 'B', 10)
    pdf.set_text_color(100, 100, 100)
    info_line1 = f'Code ROME: {variante.code_rome} | Langue: {langue_labels.get(variante.langue.value, variante.langue.value)}'
    pdf.cell(0, 6, info_line1, 0, 1, 'C')

    # Ligne 2 : Public, Format, Genre
    info_line2 = (
        f'Public: {age_labels.get(variante.tranche_age.value, variante.tranche_age.value)} | '
        f'Format: {format_labels.get(variante.format_contenu.value, variante.format_contenu.value)} | '
        f'Genre: {genre_labels.get(variante.genre.value, variante.genre.value)}'
    )
    pdf.cell(0, 6, info_line2, 0, 1, 'C')
    pdf.ln(5)

    # Description
    if variante.description:
        pdf.section_title('DESCRIPTION DU METIER')
        pdf.add_text_block(variante.description)

        if variante.description_courte:
            pdf.add_info_box(f'Resume: {variante.description_courte}', (255, 248, 225))

    # Compétences techniques
    if variante.competences:
        pdf.section_title('COMPETENCES TECHNIQUES REQUISES', chr(128295))
        pdf.add_list_items(variante.competences)

    # Compétences transversales
    if variante.competences_transversales:
        pdf.section_title('COMPETENCES TRANSVERSALES', chr(128101))
        pdf.add_list_items(variante.competences_transversales, (255, 87, 34))

    # Formations
    if variante.formations:
        pdf.section_title('FORMATIONS RECOMMANDEES', chr(127891))
        pdf.add_list_items(variante.formations, (33, 150, 243))

    # Certifications
    if variante.certifications:
        pdf.section_title('CERTIFICATIONS PROFESSIONNELLES', chr(128196))
        pdf.add_list_items(variante.certifications, (156, 39, 176))

    # Salaires (depuis la fiche originale)
    if fiche_originale.salaires and (fiche_originale.salaires.junior.median or fiche_originale.salaires.confirme.median or fiche_originale.salaires.senior.median):
        pdf.section_title('REMUNERATION (brut annuel)', chr(128176))
        pdf.add_salary_table(fiche_originale.salaires)

    # Perspectives (depuis la fiche originale)
    if fiche_originale.perspectives:
        pdf.section_title('PERSPECTIVES D\'EMPLOI', chr(128200))

        info_text = f'Tendance du marche: {fiche_originale.perspectives.tendance.value.title()}'
        if fiche_originale.perspectives.tension:
            tension_pct = fiche_originale.perspectives.tension * 100
            info_text += f' | Tension recrutement: {tension_pct:.0f}%'
        if fiche_originale.perspectives.nombre_offres:
            info_text += f' | Offres recentes: {fiche_originale.perspectives.nombre_offres}'
        if fiche_originale.perspectives.taux_insertion:
            insertion_pct = fiche_originale.perspectives.taux_insertion * 100
            info_text += f' | Taux insertion: {insertion_pct:.0f}%'

        pdf.add_info_box(info_text, (232, 245, 233))

        if fiche_originale.perspectives.evolution_5ans:
            pdf.add_text_block(f'Evolution sur 5 ans: {fiche_originale.perspectives.evolution_5ans}')

    # Conditions de travail
    if variante.conditions_travail:
        pdf.section_title('CONDITIONS DE TRAVAIL', chr(128188))
        pdf.add_list_items(variante.conditions_travail, (96, 125, 139))

    # Environnements professionnels
    if variante.environnements:
        pdf.section_title('ENVIRONNEMENTS PROFESSIONNELS', chr(127970))
        pdf.add_list_items(variante.environnements, (63, 81, 181))

    # Métadonnées
    metadata = {
        'Version': variante.version,
        'Date de creation': variante.date_creation.strftime('%d/%m/%Y'),
        'Derniere MAJ': variante.date_maj.strftime('%d/%m/%Y')
    }
    pdf.add_metadata_footer(metadata)

    # Générer le PDF
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return bytes(pdf.output())
