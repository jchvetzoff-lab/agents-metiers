"""
Générateur de PDF minimal pour les fiches métiers.
"""
from datetime import datetime
from pathlib import Path
from typing import Optional
from fpdf import FPDF
from database.models import FicheMetier, VarianteFiche


class FichePDF(FPDF):
    """PDF minimal sans tableaux ni mise en page complexe."""

    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=25)
        self.set_margins(25, 25, 25)

    def header(self):
        """En-tête simple."""
        self.set_font('Arial', 'B', 16)
        self.set_text_color(74, 57, 192)
        self.ln(10)
        self.multi_cell(0, 8, 'FICHE METIER', align='C')
        self.ln(5)

    def footer(self):
        """Pied de page simple."""
        self.set_y(-20)
        self.set_font('Arial', '', 8)
        self.set_text_color(120, 120, 120)
        self.multi_cell(0, 5, f'Page {self.page_no()} - {datetime.now().strftime("%d/%m/%Y")}', align='C')


def generer_pdf_fiche(fiche: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """Génère un PDF minimal."""
    pdf = FichePDF()
    pdf.add_page()

    # Titre
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 8, fiche.nom_masculin, align='C')
    pdf.ln(3)

    # Code ROME
    pdf.set_font('Arial', '', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 5, f'Code ROME: {fiche.code_rome}', align='C')
    pdf.ln(5)

    # Appellations
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 6, 'APPELLATIONS')
    pdf.ln(2)

    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 5, f'Masculin: {fiche.nom_masculin}')
    pdf.multi_cell(0, 5, f'Feminin: {fiche.nom_feminin}')
    pdf.multi_cell(0, 5, f'Epicene: {fiche.nom_epicene}')
    pdf.ln(3)

    # Description
    if fiche.description:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'DESCRIPTION')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        pdf.multi_cell(0, 5, fiche.description)
        pdf.ln(3)

    # Compétences techniques
    if fiche.competences:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'COMPETENCES TECHNIQUES')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for comp in fiche.competences[:20]:  # Limiter à 20 pour éviter les problèmes
            comp_clean = comp.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {comp_clean}')
        pdf.ln(3)

    # Compétences transversales
    if fiche.competences_transversales:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'COMPETENCES TRANSVERSALES')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for comp in fiche.competences_transversales[:20]:
            comp_clean = comp.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {comp_clean}')
        pdf.ln(3)

    # Formations
    if fiche.formations:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'FORMATIONS')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for form in fiche.formations[:20]:
            form_clean = form.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {form_clean}')
        pdf.ln(3)

    # Certifications
    if fiche.certifications:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'CERTIFICATIONS')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for cert in fiche.certifications[:20]:
            cert_clean = cert.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {cert_clean}')
        pdf.ln(3)

    # Salaires
    if fiche.salaires:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'REMUNERATION (brut annuel)')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)

        if fiche.salaires.junior.median:
            pdf.multi_cell(0, 5, f'Junior: {fiche.salaires.junior.median:,} EUR')
        if fiche.salaires.confirme.median:
            pdf.multi_cell(0, 5, f'Confirme: {fiche.salaires.confirme.median:,} EUR')
        if fiche.salaires.senior.median:
            pdf.multi_cell(0, 5, f'Senior: {fiche.salaires.senior.median:,} EUR')
        pdf.ln(3)

    # Perspectives
    if fiche.perspectives:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'PERSPECTIVES')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)

        tendance = fiche.perspectives.tendance.value if fiche.perspectives.tendance else 'N/A'
        pdf.multi_cell(0, 5, f'Tendance: {tendance}')

        if fiche.perspectives.tension:
            pdf.multi_cell(0, 5, f'Tension: {fiche.perspectives.tension:.0%}')
        pdf.ln(3)

    # Conditions de travail
    if fiche.conditions_travail:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'CONDITIONS DE TRAVAIL')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for cond in fiche.conditions_travail[:20]:
            cond_clean = cond.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {cond_clean}')
        pdf.ln(3)

    # Environnements
    if fiche.environnements:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'ENVIRONNEMENTS')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for env in fiche.environnements[:20]:
            env_clean = env.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {env_clean}')
        pdf.ln(3)

    # Métadonnées
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(0, 5, f'Version {fiche.metadata.version} - MAJ: {fiche.metadata.date_maj.strftime("%d/%m/%Y")}', align='C')

    # Générer
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return bytes(pdf.output())


def generer_pdf_variante(variante: VarianteFiche, fiche_originale: FicheMetier, output_path: Optional[Path] = None) -> bytes:
    """Génère un PDF minimal pour une variante."""
    pdf = FichePDF()
    pdf.add_page()

    # Titre
    pdf.set_font('Arial', 'B', 16)
    pdf.set_text_color(0, 0, 0)
    pdf.multi_cell(0, 8, variante.nom, align='C')
    pdf.ln(3)

    # Infos
    pdf.set_font('Arial', '', 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(0, 5, f'Code ROME: {variante.code_rome}', align='C')
    pdf.multi_cell(0, 5, f'Langue: {variante.langue.value} | Genre: {variante.genre.value}', align='C')
    pdf.ln(5)

    # Description
    if variante.description:
        pdf.set_font('Arial', 'B', 11)
        pdf.set_text_color(0, 0, 0)
        pdf.multi_cell(0, 6, 'DESCRIPTION')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        pdf.multi_cell(0, 5, variante.description)
        pdf.ln(3)

    # Compétences
    if variante.competences:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'COMPETENCES')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for comp in variante.competences[:20]:
            comp_clean = comp.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {comp_clean}')
        pdf.ln(3)

    # Formations
    if variante.formations:
        pdf.set_font('Arial', 'B', 11)
        pdf.multi_cell(0, 6, 'FORMATIONS')
        pdf.ln(2)
        pdf.set_font('Arial', '', 10)
        for form in variante.formations[:20]:
            form_clean = form.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 5, f'- {form_clean}')
        pdf.ln(3)

    # Métadonnées
    pdf.set_font('Arial', 'I', 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(0, 5, f'Version {variante.version} - MAJ: {variante.date_maj.strftime("%d/%m/%Y")}', align='C')

    # Générer
    if output_path:
        pdf.output(str(output_path))
        return None
    else:
        return bytes(pdf.output())
