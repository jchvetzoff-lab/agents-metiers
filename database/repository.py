"""
Repository pour l'accès aux données des fiches métiers.
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from contextlib import contextmanager

from sqlalchemy import create_engine, select, update, delete, func, or_
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from .models import (
    Base, FicheMetierDB, SalaireDB, HistoriqueVeilleDB, AuditLogDB, DictionnaireGenreDB,
    VarianteFicheDB, UserDB, RefreshTokenDB,
    FicheMetier, Salaire, HistoriqueVeille, AuditLog, DictionnaireGenre, VarianteFiche,
    TypeEvenement, StatutFiche, NiveauExperience, LangueSupporte, TrancheAge,
    FormatContenu, GenreGrammatical
)


logger = logging.getLogger(__name__)


class Repository:
    """Repository pour l'accès à la base de données."""

    def __init__(self, db_path: Optional[Path] = None, database_url: Optional[str] = None, echo: bool = False):
        """
        Initialise le repository.

        Args:
            db_path: Chemin vers le fichier SQLite (dev local)
            database_url: URL de connexion (PostgreSQL en production)
            echo: Afficher les requêtes SQL (debug)
        """
        self.db_path = db_path

        # Déterminer la chaîne de connexion
        if database_url:
            # PostgreSQL (production)
            # Render utilise postgres:// mais SQLAlchemy attend postgresql://
            connection_string = database_url
            if connection_string.startswith("postgres://"):
                connection_string = connection_string.replace("postgres://", "postgresql://", 1)

            self.engine = create_engine(
                connection_string,
                echo=echo,
                pool_pre_ping=True,  # Vérifier la connexion avant utilisation
                pool_recycle=3600,   # Recycler les connexions toutes les heures
            )
        elif db_path:
            # SQLite (développement local)
            self.engine = create_engine(
                f"sqlite:///{db_path}",
                echo=echo,
                connect_args={"check_same_thread": False}
            )
        else:
            raise ValueError("db_path ou database_url doit être fourni")

        self.SessionLocal = sessionmaker(bind=self.engine)

    def init_db(self) -> None:
        """Crée les tables si elles n'existent pas."""
        Base.metadata.create_all(self.engine)

    def drop_all(self) -> None:
        """Supprime toutes les tables (attention!)."""
        Base.metadata.drop_all(self.engine)

    @contextmanager
    def session(self):
        """Context manager pour les sessions de base de données."""
        session = self.SessionLocal()
        try:
            yield session
            session.flush()  # Valider les changements avant commit
            session.commit()
        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error: {type(e).__name__}: {e}")
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Unexpected error in session: {type(e).__name__}: {e}")
            raise
        finally:
            session.close()

    # =========================================================================
    # Fiches Métiers
    # =========================================================================

    def create_fiche(self, fiche: FicheMetier) -> FicheMetier:
        """Crée une nouvelle fiche métier."""
        with self.session() as session:
            db_fiche = FicheMetierDB.from_pydantic(fiche)
            session.add(db_fiche)
            session.flush()
            return db_fiche.to_pydantic()

    def get_fiche(self, code_rome: str) -> Optional[FicheMetier]:
        """Récupère une fiche par son code ROME."""
        with self.session() as session:
            result = session.execute(
                select(FicheMetierDB).where(FicheMetierDB.code_rome == code_rome)
            ).scalar_one_or_none()
            return result.to_pydantic() if result else None

    def get_all_fiches(
        self,
        statut: Optional[StatutFiche] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[FicheMetier]:
        """Récupère toutes les fiches, avec filtrage optionnel."""
        with self.session() as session:
            query = select(FicheMetierDB)
            if statut:
                query = query.where(FicheMetierDB.statut == statut.value)
            # Tri déterministe pour pagination cohérente
            query = query.order_by(FicheMetierDB.code_rome).limit(limit).offset(offset)
            results = session.execute(query).scalars().all()
            return [r.to_pydantic() for r in results]

    def update_fiche(self, fiche: FicheMetier) -> FicheMetier:
        """Met à jour une fiche existante."""
        with self.session() as session:
            db_fiche = session.execute(
                select(FicheMetierDB).where(FicheMetierDB.code_rome == fiche.code_rome)
            ).scalar_one_or_none()

            if not db_fiche:
                raise ValueError(f"Fiche {fiche.code_rome} non trouvée")

            # Mise à jour des champs
            db_fiche.nom_masculin = fiche.nom_masculin
            db_fiche.nom_feminin = fiche.nom_feminin
            db_fiche.nom_epicene = fiche.nom_epicene
            db_fiche.description = fiche.description
            db_fiche.description_courte = fiche.description_courte
            db_fiche.competences = fiche.competences
            db_fiche.competences_transversales = fiche.competences_transversales
            db_fiche.formations = fiche.formations
            db_fiche.certifications = fiche.certifications
            db_fiche.conditions_travail = fiche.conditions_travail
            db_fiche.environnements = fiche.environnements
            db_fiche.metiers_proches = fiche.metiers_proches
            db_fiche.secteurs_activite = fiche.secteurs_activite
            db_fiche.missions_principales = fiche.missions_principales
            db_fiche.acces_metier = fiche.acces_metier
            db_fiche.savoirs = fiche.savoirs
            db_fiche.autres_appellations = fiche.autres_appellations
            db_fiche.traits_personnalite = fiche.traits_personnalite
            db_fiche.aptitudes = fiche.aptitudes
            db_fiche.profil_riasec = fiche.profil_riasec
            db_fiche.competences_dimensions = fiche.competences_dimensions
            db_fiche.domaine_professionnel = fiche.domaine_professionnel
            db_fiche.preferences_interets = fiche.preferences_interets
            db_fiche.sites_utiles = fiche.sites_utiles
            db_fiche.conditions_travail_detaillees = fiche.conditions_travail_detaillees
            db_fiche.statuts_professionnels = fiche.statuts_professionnels
            db_fiche.niveau_formation = fiche.niveau_formation
            db_fiche.types_contrats = fiche.types_contrats
            db_fiche.rome_update_pending = int(fiche.rome_update_pending)
            db_fiche.salaires = fiche.salaires.model_dump(mode="json")
            db_fiche.perspectives = fiche.perspectives.model_dump(mode="json")
            db_fiche.statut = fiche.metadata.statut.value
            db_fiche.version = fiche.metadata.version + 1
            db_fiche.tags = fiche.metadata.tags
            db_fiche.date_maj = datetime.now()
            db_fiche.auteur = fiche.metadata.auteur

            session.flush()
            return db_fiche.to_pydantic()

    def delete_fiche(self, code_rome: str) -> bool:
        """Supprime une fiche métier et ses données liées (salaires, variantes)."""
        with self.session() as session:
            # Supprimer les enfants d'abord (FK sans CASCADE)
            session.execute(
                delete(SalaireDB).where(SalaireDB.code_rome == code_rome)
            )
            session.execute(
                delete(VarianteFicheDB).where(VarianteFicheDB.code_rome == code_rome)
            )
            result = session.execute(
                delete(FicheMetierDB).where(FicheMetierDB.code_rome == code_rome)
            )
            return result.rowcount > 0

    def search_fiches(
        self,
        query: str,
        limit: int = 20
    ) -> List[FicheMetier]:
        """Recherche des fiches par nom ou description."""
        with self.session() as session:
            search_pattern = f"%{query}%"
            results = session.execute(
                select(FicheMetierDB).where(
                    or_(
                        FicheMetierDB.nom_masculin.ilike(search_pattern),
                        FicheMetierDB.nom_feminin.ilike(search_pattern),
                        FicheMetierDB.description.ilike(search_pattern)
                    )
                ).limit(limit)
            ).scalars().all()
            return [r.to_pydantic() for r in results]

    def count_fiches(self, statut: Optional[StatutFiche] = None) -> int:
        """Compte le nombre de fiches."""
        with self.session() as session:
            query = select(func.count(FicheMetierDB.id))
            if statut:
                query = query.where(FicheMetierDB.statut == statut.value)
            return session.execute(query).scalar()

    def count_fiches_by_statut(self) -> dict:
        """Compte les fiches par statut en une seule requête GROUP BY."""
        with self.session() as session:
            results = session.execute(
                select(FicheMetierDB.statut, func.count(FicheMetierDB.id))
                .group_by(FicheMetierDB.statut)
            ).all()
            return {statut: count for statut, count in results}

    def get_fiches_by_codes(self, codes_rome: List[str]) -> List[FicheMetier]:
        """Récupère plusieurs fiches par leurs codes ROME."""
        with self.session() as session:
            results = session.execute(
                select(FicheMetierDB).where(FicheMetierDB.code_rome.in_(codes_rome))
            ).scalars().all()
            return [r.to_pydantic() for r in results]

    def upsert_fiche(self, fiche: FicheMetier) -> FicheMetier:
        """Crée ou met à jour une fiche."""
        existing = self.get_fiche(fiche.code_rome)
        if existing:
            return self.update_fiche(fiche)
        else:
            return self.create_fiche(fiche)

    # =========================================================================
    # Salaires
    # =========================================================================

    def add_salaire(self, salaire: Salaire) -> Salaire:
        """Ajoute un enregistrement de salaire."""
        with self.session() as session:
            db_salaire = SalaireDB(
                code_rome=salaire.code_rome,
                niveau=salaire.niveau.value,
                region=salaire.region,
                min_salaire=salaire.min_salaire,
                max_salaire=salaire.max_salaire,
                median_salaire=salaire.median_salaire,
                source=salaire.source,
                date_collecte=salaire.date_collecte
            )
            session.add(db_salaire)
            session.flush()
            salaire.id = db_salaire.id
            return salaire

    def get_salaires_metier(
        self,
        code_rome: str,
        niveau: Optional[NiveauExperience] = None
    ) -> List[Salaire]:
        """Récupère les salaires pour un métier."""
        with self.session() as session:
            query = select(SalaireDB).where(SalaireDB.code_rome == code_rome)
            if niveau:
                query = query.where(SalaireDB.niveau == niveau.value)
            results = session.execute(query).scalars().all()
            return [
                Salaire(
                    id=r.id,
                    code_rome=r.code_rome,
                    niveau=NiveauExperience(r.niveau),
                    region=r.region,
                    min_salaire=r.min_salaire,
                    max_salaire=r.max_salaire,
                    median_salaire=r.median_salaire,
                    source=r.source,
                    date_collecte=r.date_collecte
                )
                for r in results
            ]

    def get_latest_salaire(
        self,
        code_rome: str,
        niveau: NiveauExperience,
        region: Optional[str] = None
    ) -> Optional[Salaire]:
        """Récupère le dernier salaire enregistré pour un métier/niveau/région."""
        with self.session() as session:
            query = (
                select(SalaireDB)
                .where(SalaireDB.code_rome == code_rome)
                .where(SalaireDB.niveau == niveau.value)
            )
            if region:
                query = query.where(SalaireDB.region == region)
            else:
                query = query.where(SalaireDB.region.is_(None))
            query = query.order_by(SalaireDB.date_collecte.desc()).limit(1)

            result = session.execute(query).scalar_one_or_none()
            if result:
                return Salaire(
                    id=result.id,
                    code_rome=result.code_rome,
                    niveau=NiveauExperience(result.niveau),
                    region=result.region,
                    min_salaire=result.min_salaire,
                    max_salaire=result.max_salaire,
                    median_salaire=result.median_salaire,
                    source=result.source,
                    date_collecte=result.date_collecte
                )
            return None

    # =========================================================================
    # Historique de Veille
    # =========================================================================

    def add_historique_veille(self, historique: HistoriqueVeille) -> HistoriqueVeille:
        """Ajoute un enregistrement d'historique de veille."""
        with self.session() as session:
            db_hist = HistoriqueVeilleDB(
                type_veille=historique.type_veille,
                source=historique.source,
                date_execution=historique.date_execution,
                nb_elements_traites=historique.nb_elements_traites,
                nb_mises_a_jour=historique.nb_mises_a_jour,
                nb_erreurs=historique.nb_erreurs,
                details=historique.details,
                succes=historique.succes
            )
            session.add(db_hist)
            session.flush()
            historique.id = db_hist.id
            return historique

    def get_derniere_veille(self, type_veille: str) -> Optional[HistoriqueVeille]:
        """Récupère le dernier enregistrement de veille d'un type donné."""
        with self.session() as session:
            result = session.execute(
                select(HistoriqueVeilleDB)
                .where(HistoriqueVeilleDB.type_veille == type_veille)
                .order_by(HistoriqueVeilleDB.date_execution.desc())
                .limit(1)
            ).scalar_one_or_none()

            if result:
                return HistoriqueVeille(
                    id=result.id,
                    type_veille=result.type_veille,
                    source=result.source,
                    date_execution=result.date_execution,
                    nb_elements_traites=result.nb_elements_traites,
                    nb_mises_a_jour=result.nb_mises_a_jour,
                    nb_erreurs=result.nb_erreurs,
                    details=result.details,
                    succes=result.succes
                )
            return None

    # =========================================================================
    # Audit Log
    # =========================================================================

    def add_audit_log(self, log: AuditLog) -> AuditLog:
        """Ajoute un enregistrement d'audit."""
        with self.session() as session:
            db_log = AuditLogDB(
                timestamp=log.timestamp,
                type_evenement=log.type_evenement.value,
                code_rome=log.code_rome,
                agent=log.agent,
                description=log.description,
                donnees_avant=log.donnees_avant,
                donnees_apres=log.donnees_apres,
                validateur=log.validateur
            )
            session.add(db_log)
            session.flush()
            log.id = db_log.id
            return log

    def get_audit_logs(
        self,
        code_rome: Optional[str] = None,
        type_evenement: Optional[TypeEvenement] = None,
        limit: int = 100,
        search: Optional[str] = None,
        agent: Optional[str] = None,
        since: Optional[str] = None,
    ) -> List[AuditLog]:
        """Récupère les logs d'audit avec filtres optionnels."""
        from datetime import datetime as _dt
        with self.session() as session:
            query = select(AuditLogDB)
            if code_rome:
                query = query.where(AuditLogDB.code_rome == code_rome)
            if type_evenement:
                query = query.where(AuditLogDB.type_evenement == type_evenement.value)
            if search:
                pattern = f"%{search}%"
                query = query.where(
                    or_(
                        AuditLogDB.code_rome.ilike(pattern),
                        AuditLogDB.description.ilike(pattern),
                    )
                )
            if agent:
                query = query.where(AuditLogDB.agent.ilike(f"%{agent}%"))
            if since:
                try:
                    since_dt = _dt.fromisoformat(since)
                    query = query.where(AuditLogDB.timestamp >= since_dt)
                except ValueError:
                    pass
            query = query.order_by(AuditLogDB.timestamp.desc()).limit(limit)

            results = session.execute(query).scalars().all()
            return [
                AuditLog(
                    id=r.id,
                    timestamp=r.timestamp,
                    type_evenement=TypeEvenement(r.type_evenement),
                    code_rome=r.code_rome,
                    agent=r.agent,
                    description=r.description,
                    donnees_avant=r.donnees_avant,
                    donnees_apres=r.donnees_apres,
                    validateur=r.validateur
                )
                for r in results
            ]

    # =========================================================================
    # Dictionnaire de Genre
    # =========================================================================

    def add_correspondance_genre(self, correspondance: DictionnaireGenre) -> None:
        """Ajoute une correspondance de genre au dictionnaire."""
        with self.session() as session:
            db_entry = DictionnaireGenreDB(
                masculin=correspondance.masculin,
                feminin=correspondance.feminin,
                epicene=correspondance.epicene,
                categorie=correspondance.categorie
            )
            session.add(db_entry)

    def get_correspondance_genre(self, masculin: str) -> Optional[DictionnaireGenre]:
        """Récupère une correspondance de genre par le terme masculin."""
        with self.session() as session:
            result = session.execute(
                select(DictionnaireGenreDB)
                .where(DictionnaireGenreDB.masculin == masculin)
            ).scalar_one_or_none()

            if result:
                return DictionnaireGenre(
                    masculin=result.masculin,
                    feminin=result.feminin,
                    epicene=result.epicene,
                    categorie=result.categorie
                )
            return None

    def get_all_correspondances_genre(self) -> List[DictionnaireGenre]:
        """Récupère tout le dictionnaire de correspondances de genre."""
        with self.session() as session:
            results = session.execute(select(DictionnaireGenreDB)).scalars().all()
            return [
                DictionnaireGenre(
                    masculin=r.masculin,
                    feminin=r.feminin,
                    epicene=r.epicene,
                    categorie=r.categorie
                )
                for r in results
            ]

    # =========================================================================
    # Export / Import
    # =========================================================================

    def export_fiche_json(self, code_rome: str, output_path: Path) -> bool:
        """Exporte une fiche en JSON."""
        fiche = self.get_fiche(code_rome)
        if not fiche:
            return False
        output_path.write_text(fiche.to_json(), encoding="utf-8")
        return True

    def import_fiche_json(self, json_path: Path) -> FicheMetier:
        """Importe une fiche depuis un fichier JSON."""
        content = json_path.read_text(encoding="utf-8")
        fiche = FicheMetier.from_json(content)
        return self.upsert_fiche(fiche)

    def export_all_fiches_json(self, output_dir: Path) -> int:
        """Exporte toutes les fiches en JSON dans un répertoire."""
        output_dir.mkdir(parents=True, exist_ok=True)
        fiches = self.get_all_fiches(limit=10000)
        for fiche in fiches:
            file_path = output_dir / f"{fiche.code_rome}.json"
            file_path.write_text(fiche.to_json(), encoding="utf-8")
        return len(fiches)

    # =========================================================================
    # Variantes de Fiches
    # =========================================================================

    def save_variante(self, variante: VarianteFiche) -> VarianteFiche:
        """
        Sauvegarde ou met à jour une variante (upsert).

        Args:
            variante: Variante à sauvegarder

        Returns:
            Variante sauvegardée avec ID
        """
        with self.session() as session:
            # Recherche variante existante par clé composite
            existing = session.execute(
                select(VarianteFicheDB).where(
                    VarianteFicheDB.code_rome == variante.code_rome,
                    VarianteFicheDB.langue == variante.langue.value,
                    VarianteFicheDB.tranche_age == variante.tranche_age.value,
                    VarianteFicheDB.format_contenu == variante.format_contenu.value,
                    VarianteFicheDB.genre == variante.genre.value
                )
            ).scalar_one_or_none()

            if existing:
                # Mise à jour
                existing.nom = variante.nom
                existing.description = variante.description
                existing.description_courte = variante.description_courte
                existing.competences = variante.competences
                existing.competences_transversales = variante.competences_transversales
                existing.formations = variante.formations
                existing.certifications = variante.certifications
                existing.conditions_travail = variante.conditions_travail
                existing.environnements = variante.environnements
                existing.date_maj = datetime.now()
                existing.version += 1
                session.flush()
                return existing.to_pydantic()
            else:
                # Création
                db_variante = VarianteFicheDB.from_pydantic(variante)
                session.add(db_variante)
                session.flush()
                return db_variante.to_pydantic()

    def get_variante(
        self,
        code_rome: str,
        langue: LangueSupporte = LangueSupporte.FR,
        tranche_age: TrancheAge = TrancheAge.ADULTE,
        format_contenu: FormatContenu = FormatContenu.STANDARD,
        genre: GenreGrammatical = GenreGrammatical.MASCULIN
    ) -> Optional[VarianteFiche]:
        """
        Récupère une variante spécifique.

        Args:
            code_rome: Code ROME de la fiche
            langue: Langue de la variante
            tranche_age: Tranche d'âge cible
            format_contenu: Format du contenu
            genre: Genre grammatical

        Returns:
            Variante si trouvée, None sinon
        """
        with self.session() as session:
            result = session.execute(
                select(VarianteFicheDB).where(
                    VarianteFicheDB.code_rome == code_rome,
                    VarianteFicheDB.langue == langue.value,
                    VarianteFicheDB.tranche_age == tranche_age.value,
                    VarianteFicheDB.format_contenu == format_contenu.value,
                    VarianteFicheDB.genre == genre.value
                )
            ).scalar_one_or_none()
            return result.to_pydantic() if result else None

    def count_variantes(self, code_rome: str) -> int:
        """
        Compte le nombre de variantes pour une fiche.

        Args:
            code_rome: Code ROME de la fiche

        Returns:
            Nombre de variantes
        """
        with self.session() as session:
            return session.execute(
                select(func.count(VarianteFicheDB.id)).where(
                    VarianteFicheDB.code_rome == code_rome
                )
            ).scalar()

    def count_variantes_batch(self, codes_rome: list) -> dict:
        """
        Compte les variantes pour plusieurs fiches en une seule requête.
        Résout le problème N+1 queries sur la liste des fiches.

        Args:
            codes_rome: Liste de codes ROME

        Returns:
            Dict {code_rome: count}
        """
        if not codes_rome:
            return {}
        with self.session() as session:
            results = session.execute(
                select(VarianteFicheDB.code_rome, func.count(VarianteFicheDB.id))
                .where(VarianteFicheDB.code_rome.in_(codes_rome))
                .group_by(VarianteFicheDB.code_rome)
            ).all()
            counts = {code_rome: count for code_rome, count in results}
            # Retourner 0 pour les fiches sans variantes
            return {code: counts.get(code, 0) for code in codes_rome}

    def get_all_variantes(self, code_rome: str) -> List[VarianteFiche]:
        """
        Récupère toutes les variantes d'une fiche.

        Args:
            code_rome: Code ROME de la fiche

        Returns:
            Liste des variantes
        """
        with self.session() as session:
            results = session.execute(
                select(VarianteFicheDB).where(
                    VarianteFicheDB.code_rome == code_rome
                ).order_by(
                    VarianteFicheDB.langue,
                    VarianteFicheDB.tranche_age,
                    VarianteFicheDB.format_contenu,
                    VarianteFicheDB.genre
                )
            ).scalars().all()
            return [r.to_pydantic() for r in results]

    def delete_variantes(self, code_rome: str) -> int:
        """
        Supprime toutes les variantes d'une fiche.

        Args:
            code_rome: Code ROME de la fiche

        Returns:
            Nombre de variantes supprimées
        """
        with self.session() as session:
            result = session.execute(
                delete(VarianteFicheDB).where(
                    VarianteFicheDB.code_rome == code_rome
                )
            )
            return result.rowcount

    # ============================================================================
    # Users (persistance en base)
    # ============================================================================

    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Retourne un user par email, ou None."""
        with self.session() as session:
            row = session.execute(
                select(UserDB).where(UserDB.email == email)
            ).scalar_one_or_none()
            if row is None:
                return None
            return {
                "id": row.id,
                "email": row.email,
                "name": row.name,
                "password_hash": row.password_hash,
            }

    def get_user_by_id(self, user_id: int) -> Optional[dict]:
        """Retourne un user par ID, ou None."""
        with self.session() as session:
            row = session.execute(
                select(UserDB).where(UserDB.id == user_id)
            ).scalar_one_or_none()
            if row is None:
                return None
            return {
                "id": row.id,
                "email": row.email,
                "name": row.name,
                "password_hash": row.password_hash,
            }

    def create_user(self, email: str, name: str, password_hash: str) -> dict:
        """Crée un nouvel utilisateur et retourne ses données."""
        with self.session() as session:
            user = UserDB(email=email, name=name, password_hash=password_hash)
            session.add(user)
            session.flush()
            return {
                "id": user.id,
                "email": user.email,
                "name": user.name,
            }

    # ============================================================================
    # Refresh Tokens
    # ============================================================================

    def save_refresh_token(self, token_hash: str, user_id: int, expires_at: datetime) -> None:
        """Store a hashed refresh token."""
        with self.session() as session:
            rt = RefreshTokenDB(
                token_hash=token_hash,
                user_id=user_id,
                expires_at=expires_at,
            )
            session.add(rt)

    def get_refresh_token(self, token_hash: str) -> Optional[dict]:
        """Get a refresh token by its hash. Returns None if not found or revoked."""
        with self.session() as session:
            row = session.execute(
                select(RefreshTokenDB).where(
                    RefreshTokenDB.token_hash == token_hash,
                    RefreshTokenDB.revoked == False,
                )
            ).scalar_one_or_none()
            if row is None:
                return None
            return {
                "id": row.id,
                "token_hash": row.token_hash,
                "user_id": row.user_id,
                "expires_at": row.expires_at,
                "created_at": row.created_at,
            }

    def revoke_refresh_token(self, token_hash: str) -> bool:
        """Revoke a specific refresh token. Returns True if found and revoked."""
        with self.session() as session:
            result = session.execute(
                update(RefreshTokenDB)
                .where(RefreshTokenDB.token_hash == token_hash, RefreshTokenDB.revoked == False)
                .values(revoked=True)
            )
            return result.rowcount > 0

    def revoke_all_user_tokens(self, user_id: int) -> int:
        """Revoke all refresh tokens for a user. Returns count revoked."""
        with self.session() as session:
            result = session.execute(
                update(RefreshTokenDB)
                .where(RefreshTokenDB.user_id == user_id, RefreshTokenDB.revoked == False)
                .values(revoked=True)
            )
            return result.rowcount

    def cleanup_expired_tokens(self) -> int:
        """Delete expired or revoked refresh tokens. Returns count deleted."""
        with self.session() as session:
            result = session.execute(
                delete(RefreshTokenDB).where(
                    or_(
                        RefreshTokenDB.expires_at < datetime.now(),
                        RefreshTokenDB.revoked == True,
                    )
                )
            )
            return result.rowcount
