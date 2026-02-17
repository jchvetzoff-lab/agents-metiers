"""
Interface en ligne de commande pour le système de fiches métiers.
"""
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.tree import Tree
from rich import print as rprint

from config import get_config, Config
from database.repository import Repository
from database.models import StatutFiche
from orchestrator.orchestrator import Orchestrator, TypeTache
from logging_system.journal import Journal
from interface.validation import ValidationSystem


console = Console()


def get_repository() -> Repository:
    """Crée et retourne le repository."""
    config = get_config()
    repo = Repository(config.db_path)
    repo.init_db()
    return repo


def get_orchestrator(repo: Repository, journal: Journal) -> Orchestrator:
    """Crée et retourne l'orchestrateur avec clients France Travail."""
    from sources.france_travail import FranceTravailClient
    from sources.france_travail_rome import FranceTravailROMEClient

    config = get_config()

    # Instancier les clients France Travail si credentials disponibles
    france_travail_client = None
    rome_client = None
    if config.api.france_travail_client_id and config.api.france_travail_client_secret:
        france_travail_client = FranceTravailClient()
        rome_client = FranceTravailROMEClient()

    return Orchestrator(
        repository=repo,
        journal=journal,
        france_travail_client=france_travail_client,
        rome_client=rome_client,
    )


@click.group()
@click.version_option(version="1.0.0", prog_name="agents-metiers")
def cli():
    """
    Système multi-agents pour la gestion des fiches métiers.

    Ce système permet de créer, maintenir et mettre à jour automatiquement
    les fiches métiers en collectant des données depuis diverses sources
    (ROME, France Travail, INSEE, DARES).
    """
    pass


# =============================================================================
# Commandes d'initialisation
# =============================================================================

@cli.command()
@click.option("--force", is_flag=True, help="Réinitialiser la base de données")
def init(force: bool):
    """Initialise la base de données et importe le référentiel ROME."""
    config = get_config()
    console.print(Panel.fit(
        "[bold blue]Initialisation du système de fiches métiers[/bold blue]"
    ))

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        # Initialiser la base
        task = progress.add_task("Initialisation de la base de données...", total=None)
        repo = Repository(config.db_path)

        if force:
            repo.drop_all()
            console.print("[yellow]Base de données réinitialisée[/yellow]")

        repo.init_db()
        progress.update(task, description="Base de données initialisée ✓")

        # Créer les répertoires
        task2 = progress.add_task("Création des répertoires...", total=None)
        config.ensure_directories()
        progress.update(task2, description="Répertoires créés ✓")

    console.print("\n[green]✓ Initialisation terminée[/green]")
    console.print(f"  Base de données: {config.db_path}")
    console.print(f"  Fiches: {config.fiches_path}")
    console.print(f"  Rapports: {config.rapports_path}")


@cli.command("import-rome")
@click.option("--limit", default=0, help="Limiter le nombre de métiers importés (0 = tous)")
def import_rome(limit: int):
    """Importe le référentiel ROME depuis l'API France Travail."""
    console.print(Panel.fit(
        "[bold blue]Import du référentiel ROME[/bold blue]"
    ))

    repo = get_repository()
    journal = Journal()

    async def run_import():
        orchestrator = get_orchestrator(repo, journal)
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Import en cours...", total=None)
            result = await orchestrator.executer_tache(TypeTache.IMPORT_ROME)
            progress.update(task, description="Import terminé ✓")
        return result

    result = asyncio.run(run_import())

    if result.get("status") == "success":
        console.print(f"\n[green]✓ Import terminé[/green]")
        console.print(f"  Fiches importées: {result.get('fiches_importees', 0)}")
        console.print(f"  Erreurs: {result.get('erreurs', 0)}")
    else:
        console.print(f"\n[red]✗ Erreur: {result.get('error')}[/red]")


# =============================================================================
# Commandes de veille
# =============================================================================

@cli.command()
@click.option("--type", "veille_type", type=click.Choice(["salaires", "metiers", "all"]),
              default="all", help="Type de veille à exécuter")
@click.option("--codes", multiple=True, help="Codes ROME spécifiques à traiter")
def veille(veille_type: str, codes: tuple):
    """Lance la veille automatique (salaires et/ou métiers)."""
    console.print(Panel.fit(
        f"[bold blue]Veille {veille_type}[/bold blue]"
    ))

    repo = get_repository()
    journal = Journal()
    codes_liste = list(codes) if codes else []

    async def run_veille():
        orchestrator = get_orchestrator(repo, journal)
        results = {}

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            if veille_type in ("salaires", "all"):
                task = progress.add_task("Veille salariale...", total=None)
                results["salaires"] = await orchestrator.executer_tache(
                    TypeTache.VEILLE_SALAIRES,
                    codes_rome=codes_liste
                )
                progress.update(task, description="Veille salariale ✓")

            if veille_type in ("metiers", "all"):
                task = progress.add_task("Veille métiers...", total=None)
                results["metiers"] = await orchestrator.executer_tache(
                    TypeTache.VEILLE_METIERS,
                    codes_rome=codes_liste
                )
                progress.update(task, description="Veille métiers ✓")

        return results

    results = asyncio.run(run_veille())

    # Afficher les résultats
    for type_veille, result in results.items():
        console.print(f"\n[bold]{type_veille.title()}:[/bold]")
        if result.get("status") == "success":
            console.print(f"  Fiches traitées: {result.get('fiches_traitees', 0)}")
            console.print(f"  Mises à jour: {result.get('fiches_mises_a_jour', 0)}")
        else:
            console.print(f"  [red]Erreur: {result.get('error')}[/red]")


# =============================================================================
# Commandes de gestion des fiches
# =============================================================================

@cli.command("list")
@click.option("--statut", type=click.Choice(["brouillon", "en_validation", "publiee", "archivee"]),
              help="Filtrer par statut")
@click.option("--limit", default=20, help="Nombre max de résultats")
def list_fiches(statut: Optional[str], limit: int):
    """Liste les fiches métiers."""
    repo = get_repository()

    statut_enum = StatutFiche(statut) if statut else None
    fiches = repo.get_all_fiches(statut=statut_enum, limit=limit)

    table = Table(title="Fiches Métiers")
    table.add_column("Code ROME", style="cyan")
    table.add_column("Nom", style="green")
    table.add_column("Statut", style="yellow")
    table.add_column("Tension", style="magenta")
    table.add_column("MAJ", style="dim")

    for fiche in fiches:
        tension = f"{fiche.perspectives.tension:.0%}" if fiche.perspectives.tension else "-"
        date_maj = fiche.metadata.date_maj.strftime("%Y-%m-%d") if fiche.metadata.date_maj else "-"
        table.add_row(
            fiche.code_rome,
            fiche.nom_masculin[:40],
            fiche.metadata.statut.value,
            tension,
            date_maj
        )

    console.print(table)
    console.print(f"\nTotal: {repo.count_fiches(statut_enum)} fiches")


@cli.command("show")
@click.argument("code_rome")
def show_fiche(code_rome: str):
    """Affiche les détails d'une fiche métier."""
    repo = get_repository()
    fiche = repo.get_fiche(code_rome)

    if not fiche:
        console.print(f"[red]Fiche {code_rome} non trouvée[/red]")
        return

    # Créer l'arbre d'affichage
    tree = Tree(f"[bold cyan]{fiche.code_rome}[/bold cyan] - {fiche.nom_masculin}")

    # Noms
    noms = tree.add("[bold]Noms[/bold]")
    noms.add(f"Masculin: {fiche.nom_masculin}")
    noms.add(f"Féminin: {fiche.nom_feminin}")
    noms.add(f"Épicène: {fiche.nom_epicene}")

    # Description
    if fiche.description:
        tree.add(f"[bold]Description:[/bold] {fiche.description[:200]}...")

    # Compétences
    if fiche.competences:
        comps = tree.add("[bold]Compétences[/bold]")
        for comp in fiche.competences[:5]:
            comps.add(comp)
        if len(fiche.competences) > 5:
            comps.add(f"... et {len(fiche.competences) - 5} autres")

    # Salaires
    salaires = tree.add("[bold]Salaires[/bold]")
    for niveau in ["junior", "confirme", "senior"]:
        sal = getattr(fiche.salaires, niveau)
        if sal.median:
            salaires.add(f"{niveau.title()}: {sal.min}€ - {sal.max}€ (médian: {sal.median}€)")

    # Perspectives
    persp = tree.add("[bold]Perspectives[/bold]")
    persp.add(f"Tension: {fiche.perspectives.tension:.0%}")
    persp.add(f"Tendance: {fiche.perspectives.tendance.value}")

    # Métadonnées
    meta = tree.add("[bold]Métadonnées[/bold]")
    meta.add(f"Statut: {fiche.metadata.statut.value}")
    meta.add(f"Version: {fiche.metadata.version}")
    meta.add(f"Source: {fiche.metadata.source}")
    if fiche.metadata.date_maj:
        meta.add(f"MAJ: {fiche.metadata.date_maj.strftime('%Y-%m-%d %H:%M')}")

    console.print(tree)


@cli.command("check")
@click.argument("code_rome")
def check_fiche(code_rome: str):
    """Vérifie et traite une fiche spécifique (correction + genre)."""
    repo = get_repository()
    journal = Journal()

    fiche = repo.get_fiche(code_rome)
    if not fiche:
        console.print(f"[red]Fiche {code_rome} non trouvée[/red]")
        return

    console.print(Panel.fit(
        f"[bold blue]Vérification de la fiche {code_rome}[/bold blue]"
    ))

    async def run_check():
        orchestrator = get_orchestrator(repo, journal)
        return await orchestrator.traiter_fiche(code_rome)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Traitement en cours...", total=None)
        result = asyncio.run(run_check())
        progress.update(task, description="Traitement terminé ✓")

    # Afficher les résultats
    for etape, res in result.get("etapes", {}).items():
        status = "✓" if res.get("status") != "error" else "✗"
        console.print(f"  {etape}: {status}")


@cli.command("search")
@click.argument("query")
@click.option("--limit", default=10, help="Nombre max de résultats")
def search(query: str, limit: int):
    """Recherche des fiches par nom ou description."""
    repo = get_repository()
    fiches = repo.search_fiches(query, limit=limit)

    if not fiches:
        console.print(f"[yellow]Aucun résultat pour '{query}'[/yellow]")
        return

    table = Table(title=f"Résultats pour '{query}'")
    table.add_column("Code ROME", style="cyan")
    table.add_column("Nom", style="green")
    table.add_column("Statut", style="yellow")

    for fiche in fiches:
        table.add_row(
            fiche.code_rome,
            fiche.nom_masculin,
            fiche.metadata.statut.value
        )

    console.print(table)


# =============================================================================
# Commandes de validation
# =============================================================================

@cli.group()
def validation():
    """Commandes de gestion des validations."""
    pass


@validation.command("list")
def list_validations():
    """Liste les demandes de validation en attente."""
    repo = get_repository()
    validation_sys = ValidationSystem(repo)

    demandes = validation_sys.get_demandes_en_attente()

    if not demandes:
        console.print("[green]Aucune demande de validation en attente[/green]")
        return

    table = Table(title="Demandes de validation")
    table.add_column("ID", style="cyan")
    table.add_column("Code ROME", style="green")
    table.add_column("Type", style="yellow")
    table.add_column("Priorité", style="magenta")
    table.add_column("Date", style="dim")

    for d in demandes:
        table.add_row(
            d.id,
            d.code_rome,
            d.type_modification,
            str(d.priorite),
            d.date_demande.strftime("%Y-%m-%d %H:%M")
        )

    console.print(table)


@cli.command("publish")
@click.argument("code_rome")
def publish_fiche(code_rome: str):
    """Publie une fiche (passe en statut 'publiee')."""
    repo = get_repository()
    fiche = repo.get_fiche(code_rome)

    if not fiche:
        console.print(f"[red]Fiche {code_rome} non trouvée[/red]")
        return

    ancien_statut = fiche.metadata.statut.value
    fiche.metadata.statut = StatutFiche.PUBLIEE
    fiche.metadata.date_maj = datetime.now()
    repo.update_fiche(fiche)

    console.print(f"[green]✓ Fiche {code_rome} publiée ![/green]")
    console.print(f"  Statut: {ancien_statut} → publiee")


@cli.command("publish-all")
def publish_all_fiches():
    """Publie toutes les fiches non publiées."""
    repo = get_repository()

    # Récupérer les fiches non publiées
    fiches_brouillon = repo.get_all_fiches(statut=StatutFiche.BROUILLON, limit=1000)
    fiches_validation = repo.get_all_fiches(statut=StatutFiche.EN_VALIDATION, limit=1000)
    fiches = fiches_brouillon + fiches_validation

    if not fiches:
        console.print("[green]Toutes les fiches sont déjà publiées ![/green]")
        return

    console.print(f"[bold]Publication de {len(fiches)} fiches...[/bold]\n")

    count = 0
    for fiche in fiches:
        fiche.metadata.statut = StatutFiche.PUBLIEE
        fiche.metadata.date_maj = datetime.now()
        repo.update_fiche(fiche)
        console.print(f"  ✓ {fiche.code_rome} - {fiche.nom_masculin}")
        count += 1

    console.print(f"\n[green]✓ {count} fiches publiées ![/green]")


@cli.command("enrich")
@click.argument("code_rome")
def enrich_fiche(code_rome: str):
    """Enrichit une fiche avec description, compétences, salaires via Claude API."""
    repo = get_repository()
    fiche = repo.get_fiche(code_rome)

    if not fiche:
        console.print(f"[red]Fiche {code_rome} non trouvée[/red]")
        return

    console.print(Panel.fit(
        f"[bold blue]Enrichissement de {code_rome} - {fiche.nom_masculin}[/bold blue]"
    ))

    async def run_enrich():
        from agents.redacteur_fiche import AgentRedacteurFiche
        try:
            import anthropic
            claude_client = anthropic.AsyncAnthropic()
        except Exception:
            claude_client = None
            console.print("[yellow]Client Claude non disponible, mode simulation[/yellow]")

        agent = AgentRedacteurFiche(repository=repo, claude_client=claude_client)
        return await agent.run(codes_rome=[code_rome])

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Enrichissement en cours...", total=None)
        result = asyncio.run(run_enrich())
        progress.update(task, description="Enrichissement terminé ✓")

    if result.get("status") == "success":
        console.print(f"\n[green]✓ Fiche {code_rome} enrichie ![/green]")
        for detail in result.get("details", []):
            console.print(f"  {detail.get('code_rome')}: {detail.get('status')}")
    else:
        console.print(f"\n[red]✗ Erreur: {result.get('error')}[/red]")


@cli.command("enrich-batch")
@click.option("--batch-size", default=5, help="Nombre de fiches à traiter par lot")
@click.option("--statut", type=click.Choice(["brouillon", "en_validation"]),
              default="brouillon", help="Statut des fiches à enrichir")
def enrich_batch(batch_size: int, statut: str):
    """Enrichit un lot de fiches brouillon via Claude API."""
    repo = get_repository()

    statut_enum = StatutFiche(statut)
    nb_fiches = repo.count_fiches(statut_enum)

    if nb_fiches == 0:
        console.print(f"[green]Aucune fiche en statut '{statut}' à enrichir[/green]")
        return

    console.print(Panel.fit(
        f"[bold blue]Enrichissement par lot ({batch_size} fiches sur {nb_fiches} en '{statut}')[/bold blue]"
    ))

    async def run_enrich():
        from agents.redacteur_fiche import AgentRedacteurFiche
        try:
            import anthropic
            claude_client = anthropic.AsyncAnthropic()
        except Exception:
            claude_client = None
            console.print("[yellow]Client Claude non disponible, mode simulation[/yellow]")

        agent = AgentRedacteurFiche(repository=repo, claude_client=claude_client)
        return await agent.run(batch_size=batch_size)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Enrichissement du lot...", total=None)
        result = asyncio.run(run_enrich())
        progress.update(task, description="Lot terminé ✓")

    if result.get("status") == "success":
        console.print(f"\n[green]✓ {result.get('fiches_enrichies', 0)} fiches enrichies[/green]")
        console.print(f"  Erreurs: {result.get('erreurs', 0)}")
        for detail in result.get("details", []):
            status_icon = "✓" if detail.get("status") != "erreur" else "✗"
            console.print(f"  {status_icon} {detail.get('code_rome')} - {detail.get('nom', '')}")
    else:
        console.print(f"\n[red]✗ Erreur: {result.get('error')}[/red]")


@cli.command("create-fiche")
@click.argument("nom_metier")
def create_fiche(nom_metier: str):
    """Crée une fiche complète à partir d'un nom de métier (ex: 'Prompt Engineer')."""
    repo = get_repository()

    console.print(Panel.fit(
        f"[bold blue]Création de fiche pour : {nom_metier}[/bold blue]"
    ))

    async def run_create():
        from agents.redacteur_fiche import AgentRedacteurFiche
        try:
            import anthropic
            claude_client = anthropic.AsyncAnthropic()
        except Exception:
            claude_client = None
            console.print("[yellow]Client Claude non disponible, mode simulation[/yellow]")

        agent = AgentRedacteurFiche(repository=repo, claude_client=claude_client)
        return await agent.run(nom_metier=nom_metier)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Génération en cours...", total=None)
        result = asyncio.run(run_create())
        progress.update(task, description="Génération terminée ✓")

    if result.get("status") == "success":
        details = result.get("details", [{}])
        code = details[0].get("code_rome", "?") if details else "?"
        console.print(f"\n[green]✓ Fiche créée : {code}[/green]")
        console.print(f"  Utilisez 'python main.py show {code}' pour voir le détail")
    else:
        console.print(f"\n[red]✗ Erreur: {result.get('error')}[/red]")


@cli.command("check-all")
def check_all_fiches():
    """Vérifie et traite toutes les fiches (correction + genre)."""
    repo = get_repository()
    journal = Journal()
    fiches = repo.get_all_fiches(limit=1000)

    if not fiches:
        console.print("[yellow]Aucune fiche à traiter[/yellow]")
        return

    console.print(f"[bold]Traitement de {len(fiches)} fiches...[/bold]\n")

    async def run_check_all():
        orchestrator = get_orchestrator(repo, journal)
        results = []
        for fiche in fiches:
            result = await orchestrator.traiter_fiche(fiche.code_rome)
            results.append((fiche.code_rome, result))
        return results

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Traitement en cours...", total=None)
        results = asyncio.run(run_check_all())
        progress.update(task, description="Traitement terminé ✓")

    # Résumé
    success = sum(1 for _, r in results if r.get("status") == "success")
    console.print(f"\n[green]✓ {success}/{len(fiches)} fiches traitées avec succès[/green]")


# =============================================================================
# Commandes de statistiques
# =============================================================================

@cli.command("stats")
def stats():
    """Affiche les statistiques du système."""
    repo = get_repository()
    journal = Journal()

    # Stats fiches
    console.print(Panel.fit("[bold blue]Statistiques[/bold blue]"))

    table = Table(title="Fiches Métiers")
    table.add_column("Statut", style="cyan")
    table.add_column("Nombre", style="green")

    for statut in StatutFiche:
        count = repo.count_fiches(statut)
        table.add_row(statut.value, str(count))

    table.add_row("[bold]Total[/bold]", f"[bold]{repo.count_fiches()}[/bold]")

    console.print(table)

    # Stats logs
    log_stats = journal.get_stats()
    console.print("\n[bold]Logs:[/bold]")
    for niveau, count in log_stats.items():
        console.print(f"  {niveau}: {count}")


@cli.command("export")
@click.option("--output", "-o", type=click.Path(), default="data/fiches",
              help="Répertoire de sortie")
@click.option("--format", "fmt", type=click.Choice(["json"]), default="json",
              help="Format d'export")
def export_fiches(output: str, fmt: str):
    """Exporte les fiches métiers."""
    repo = get_repository()
    output_path = Path(output)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        task = progress.add_task("Export en cours...", total=None)
        count = repo.export_all_fiches_json(output_path)
        progress.update(task, description="Export terminé ✓")

    console.print(f"\n[green]✓ {count} fiches exportées dans {output_path}[/green]")


# =============================================================================
# Commandes de démarrage du service
# =============================================================================

@cli.command("serve")
@click.option("--interval", default=24, help="Intervalle de veille en heures")
def serve(interval: int):
    """Démarre le service de veille automatique."""
    console.print(Panel.fit(
        "[bold blue]Démarrage du service de veille[/bold blue]"
    ))

    repo = get_repository()
    journal = Journal()

    async def run_service():
        orchestrator = get_orchestrator(repo, journal)
        await orchestrator.demarrer()

        console.print("[green]Service démarré - Ctrl+C pour arrêter[/green]")
        console.print(f"Intervalle de veille: {interval}h")

        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            console.print("\n[yellow]Arrêt du service...[/yellow]")
            await orchestrator.arreter()
            console.print("[green]Service arrêté[/green]")

    asyncio.run(run_service())


class CLI:
    """Classe wrapper pour l'interface CLI."""

    def __init__(self):
        self.console = console

    def run(self):
        """Lance l'interface CLI."""
        cli()


if __name__ == "__main__":
    cli()
