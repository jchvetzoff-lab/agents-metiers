"""
Système de validation humaine des fiches métiers.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum

from database.models import FicheMetier, StatutFiche
from database.repository import Repository


class ActionValidation(Enum):
    """Actions possibles lors de la validation."""
    APPROUVER = "approuver"
    REJETER = "rejeter"
    MODIFIER = "modifier"
    REPORTER = "reporter"


@dataclass
class DemandeValidation:
    """Représente une demande de validation."""
    id: str
    code_rome: str
    fiche: FicheMetier
    type_modification: str  # "creation", "mise_a_jour", "correction", "genre"
    modifications: Dict[str, Any]
    date_demande: datetime = field(default_factory=datetime.now)
    priorite: int = 1  # 1 = haute, 5 = basse
    commentaires: List[str] = field(default_factory=list)
    assignee: Optional[str] = None

    def __hash__(self):
        return hash(self.id)


@dataclass
class ResultatValidation:
    """Résultat d'une validation."""
    demande_id: str
    action: ActionValidation
    validateur: str
    date_validation: datetime
    commentaire: Optional[str] = None
    modifications_appliquees: Optional[Dict] = None


class ValidationSystem:
    """
    Système de validation humaine des modifications.

    Permet de :
    - Créer des demandes de validation
    - Lister les demandes en attente
    - Approuver ou rejeter des modifications
    - Suivre l'historique des validations
    """

    def __init__(self, repository: Repository):
        """
        Initialise le système de validation.

        Args:
            repository: Repository pour l'accès aux données
        """
        self.repository = repository
        self._demandes: Dict[str, DemandeValidation] = {}
        self._historique: List[ResultatValidation] = []
        self._callbacks: List[Callable[[ResultatValidation], None]] = []
        self._compteur = 0

    def creer_demande(
        self,
        fiche: FicheMetier,
        type_modification: str,
        modifications: Dict[str, Any],
        priorite: int = 1,
        commentaire: Optional[str] = None
    ) -> DemandeValidation:
        """
        Crée une nouvelle demande de validation.

        Args:
            fiche: Fiche concernée
            type_modification: Type de modification
            modifications: Détails des modifications
            priorite: Priorité (1=haute, 5=basse)
            commentaire: Commentaire initial

        Returns:
            Demande créée
        """
        self._compteur += 1
        demande_id = f"VAL-{self._compteur:06d}"

        demande = DemandeValidation(
            id=demande_id,
            code_rome=fiche.code_rome,
            fiche=fiche,
            type_modification=type_modification,
            modifications=modifications,
            priorite=priorite,
            commentaires=[commentaire] if commentaire else []
        )

        self._demandes[demande_id] = demande

        # Mettre la fiche en statut validation
        fiche.metadata.statut = StatutFiche.EN_VALIDATION
        self.repository.update_fiche(fiche)

        return demande

    def get_demande(self, demande_id: str) -> Optional[DemandeValidation]:
        """Récupère une demande par son ID."""
        return self._demandes.get(demande_id)

    def get_demandes_en_attente(
        self,
        assignee: Optional[str] = None,
        priorite_max: Optional[int] = None
    ) -> List[DemandeValidation]:
        """
        Récupère les demandes en attente.

        Args:
            assignee: Filtrer par assigné
            priorite_max: Filtrer par priorité max

        Returns:
            Liste des demandes
        """
        demandes = list(self._demandes.values())

        if assignee:
            demandes = [d for d in demandes if d.assignee == assignee]

        if priorite_max:
            demandes = [d for d in demandes if d.priorite <= priorite_max]

        # Trier par priorité puis date
        demandes.sort(key=lambda d: (d.priorite, d.date_demande))

        return demandes

    def assigner_demande(
        self,
        demande_id: str,
        assignee: str
    ) -> bool:
        """
        Assigne une demande à un validateur.

        Args:
            demande_id: ID de la demande
            assignee: Validateur assigné

        Returns:
            True si succès
        """
        demande = self._demandes.get(demande_id)
        if not demande:
            return False

        demande.assignee = assignee
        return True

    def approuver(
        self,
        demande_id: str,
        validateur: str,
        commentaire: Optional[str] = None
    ) -> Optional[ResultatValidation]:
        """
        Approuve une demande de validation.

        Args:
            demande_id: ID de la demande
            validateur: Identifiant du validateur
            commentaire: Commentaire optionnel

        Returns:
            Résultat de la validation
        """
        demande = self._demandes.get(demande_id)
        if not demande:
            return None

        # Appliquer les modifications
        fiche = demande.fiche
        for key, value in demande.modifications.items():
            if hasattr(fiche, key):
                setattr(fiche, key, value)

        fiche.metadata.statut = StatutFiche.PUBLIEE
        fiche.metadata.date_maj = datetime.now()
        fiche.metadata.auteur = validateur

        self.repository.update_fiche(fiche)

        # Créer le résultat
        resultat = ResultatValidation(
            demande_id=demande_id,
            action=ActionValidation.APPROUVER,
            validateur=validateur,
            date_validation=datetime.now(),
            commentaire=commentaire,
            modifications_appliquees=demande.modifications
        )

        # Archiver
        self._historique.append(resultat)
        del self._demandes[demande_id]

        # Notifier les callbacks
        self._notifier(resultat)

        return resultat

    def rejeter(
        self,
        demande_id: str,
        validateur: str,
        motif: str
    ) -> Optional[ResultatValidation]:
        """
        Rejette une demande de validation.

        Args:
            demande_id: ID de la demande
            validateur: Identifiant du validateur
            motif: Motif du rejet

        Returns:
            Résultat de la validation
        """
        demande = self._demandes.get(demande_id)
        if not demande:
            return None

        # Remettre la fiche en brouillon
        fiche = demande.fiche
        fiche.metadata.statut = StatutFiche.BROUILLON
        self.repository.update_fiche(fiche)

        # Créer le résultat
        resultat = ResultatValidation(
            demande_id=demande_id,
            action=ActionValidation.REJETER,
            validateur=validateur,
            date_validation=datetime.now(),
            commentaire=motif
        )

        # Archiver
        self._historique.append(resultat)
        del self._demandes[demande_id]

        # Notifier les callbacks
        self._notifier(resultat)

        return resultat

    def reporter(
        self,
        demande_id: str,
        validateur: str,
        commentaire: str
    ) -> bool:
        """
        Reporte une demande pour traitement ultérieur.

        Args:
            demande_id: ID de la demande
            validateur: Identifiant du validateur
            commentaire: Raison du report

        Returns:
            True si succès
        """
        demande = self._demandes.get(demande_id)
        if not demande:
            return False

        demande.commentaires.append(f"[{validateur}] Report: {commentaire}")
        demande.priorite = min(demande.priorite + 1, 5)  # Baisser la priorité

        return True

    def ajouter_commentaire(
        self,
        demande_id: str,
        auteur: str,
        commentaire: str
    ) -> bool:
        """
        Ajoute un commentaire à une demande.

        Args:
            demande_id: ID de la demande
            auteur: Auteur du commentaire
            commentaire: Contenu du commentaire

        Returns:
            True si succès
        """
        demande = self._demandes.get(demande_id)
        if not demande:
            return False

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        demande.commentaires.append(f"[{timestamp}] {auteur}: {commentaire}")

        return True

    def on_validation(
        self,
        callback: Callable[[ResultatValidation], None]
    ) -> None:
        """
        Enregistre un callback appelé après chaque validation.

        Args:
            callback: Fonction à appeler
        """
        self._callbacks.append(callback)

    def _notifier(self, resultat: ResultatValidation) -> None:
        """Notifie les callbacks enregistrés."""
        for callback in self._callbacks:
            try:
                callback(resultat)
            except Exception:
                pass

    def get_historique(
        self,
        limite: int = 100,
        validateur: Optional[str] = None
    ) -> List[ResultatValidation]:
        """
        Récupère l'historique des validations.

        Args:
            limite: Nombre max de résultats
            validateur: Filtrer par validateur

        Returns:
            Liste des résultats
        """
        historique = self._historique

        if validateur:
            historique = [h for h in historique if h.validateur == validateur]

        return historique[-limite:]

    def get_statistiques(self) -> Dict[str, Any]:
        """
        Récupère les statistiques de validation.

        Returns:
            Statistiques
        """
        total_historique = len(self._historique)
        approuvees = len([h for h in self._historique if h.action == ActionValidation.APPROUVER])
        rejetees = len([h for h in self._historique if h.action == ActionValidation.REJETER])

        return {
            "en_attente": len(self._demandes),
            "total_traitees": total_historique,
            "approuvees": approuvees,
            "rejetees": rejetees,
            "taux_approbation": approuvees / total_historique if total_historique > 0 else 0,
            "par_priorite": {
                p: len([d for d in self._demandes.values() if d.priorite == p])
                for p in range(1, 6)
            }
        }

    def comparer_versions(
        self,
        demande_id: str
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compare la version actuelle avec les modifications proposées.

        Args:
            demande_id: ID de la demande

        Returns:
            Différences entre les versions
        """
        demande = self._demandes.get(demande_id)
        if not demande:
            return {}

        differences = {}
        fiche_actuelle = self.repository.get_fiche(demande.code_rome)

        if not fiche_actuelle:
            return {}

        for key, nouvelle_valeur in demande.modifications.items():
            ancienne_valeur = getattr(fiche_actuelle, key, None)
            if ancienne_valeur != nouvelle_valeur:
                differences[key] = {
                    "avant": ancienne_valeur,
                    "apres": nouvelle_valeur
                }

        return differences
