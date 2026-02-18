#!/usr/bin/env python3
"""
Script de test pour l'intégration des données INSEE.
Vérifie que les modules fonctionnent correctement avant déploiement.
"""

import asyncio
import sys
import os
from pathlib import Path

# Ajouter le chemin du projet
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from insee_data import insee_integrator
import logging

# Configuration logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def test_rome_pcs_mapping():
    """Test du mapping ROME -> PCS."""
    logger.info("=== Test Mapping ROME -> PCS ===")
    
    # Tester quelques codes ROME
    codes_rome_test = ["M1805", "D1402", "J1102", "K2107", "F1703"]
    
    for code_rome in codes_rome_test:
        codes_pcs = insee_integrator.rome_to_pcs.get(code_rome, [])
        logger.info(f"ROME {code_rome} -> PCS {codes_pcs}")
    
    logger.info(f"Total métiers mappés: {len(insee_integrator.rome_to_pcs)}")


async def test_salaires_pcs():
    """Test récupération salaires par PCS."""
    logger.info("=== Test Salaires PCS ===")
    
    # Test avec quelques codes PCS
    codes_pcs_test = ["388a", "462a", "311a", "421a"]
    
    try:
        salaires = await insee_integrator.get_salaires_par_pcs(codes_pcs_test)
        
        for pcs, data in salaires.items():
            logger.info(f"PCS {pcs}: {data.get('median', 'N/A')}€ (source: {data.get('source', 'N/A')})")
    
    except Exception as e:
        logger.error(f"Erreur test salaires PCS: {e}")


async def test_volume_emploi():
    """Test récupération volume d'emploi."""
    logger.info("=== Test Volume d'emploi ===")
    
    codes_rome_test = ["M1805", "D1402", "J1102"]
    
    for code_rome in codes_rome_test:
        try:
            data = await insee_integrator.get_volume_emploi(code_rome)
            logger.info(f"ROME {code_rome}: {data.get('nb_emplois', 'N/A')} emplois (source: {data.get('source', 'N/A')})")
        
        except Exception as e:
            logger.error(f"Erreur volume emploi {code_rome}: {e}")


async def test_repartition_contrats():
    """Test récupération répartition des contrats."""
    logger.info("=== Test Répartition contrats ===")
    
    codes_rome_test = ["M1805", "D1402", "J1102"]
    
    for code_rome in codes_rome_test:
        try:
            contrats = await insee_integrator.get_repartition_contrats(code_rome)
            logger.info(f"ROME {code_rome}: CDI={contrats.get('cdi', 0)}%, CDD={contrats.get('cdd', 0)}%")
        
        except Exception as e:
            logger.error(f"Erreur contrats {code_rome}: {e}")


async def test_statistiques_completes():
    """Test récupération statistiques complètes."""
    logger.info("=== Test Statistiques complètes ===")
    
    codes_rome_test = ["M1805", "D1402"]
    regions_test = [None, "11"]  # National et Île-de-France
    
    for code_rome in codes_rome_test:
        for region in regions_test:
            try:
                stats = await insee_integrator.get_statistiques_completes(code_rome, region)
                
                region_label = f"région {region}" if region else "national"
                logger.info(f"ROME {code_rome} ({region_label}):")
                logger.info(f"  - Emplois: {stats.nb_emplois}")
                logger.info(f"  - Salaire médian: {stats.salaire_median}€ si disponible")
                logger.info(f"  - Tension: {stats.tension}")
                logger.info(f"  - Source: {stats.source}")
                
            except Exception as e:
                logger.error(f"Erreur stats complètes {code_rome}/{region}: {e}")


async def test_correspondances_naf():
    """Test correspondances ROME -> NAF."""
    logger.info("=== Test Correspondances ROME -> NAF ===")
    
    codes_rome_test = ["M1805", "D1402", "J1102", "K2107", "F1703"]
    
    for code_rome in codes_rome_test:
        naf = insee_integrator._rome_to_naf(code_rome)
        logger.info(f"ROME {code_rome} -> NAF {naf}")


async def main():
    """Fonction principale de test."""
    logger.info("Début des tests intégration INSEE")
    
    try:
        # Tests synchrones
        await test_rome_pcs_mapping()
        await test_correspondances_naf()
        
        # Tests asynchrones avec données
        await test_salaires_pcs()
        await test_volume_emploi()
        await test_repartition_contrats()
        await test_statistiques_completes()
        
        logger.info("✅ Tous les tests terminés avec succès")
        
    except Exception as e:
        logger.error(f"❌ Erreur durant les tests: {e}")
        return False
    
    finally:
        # Fermer la session HTTP
        await insee_integrator.close()
    
    return True


if __name__ == "__main__":
    # Vérifier la disponibilité du fichier de mapping
    mapping_file = Path(__file__).parent / "rome_pcs_mapping.csv"
    if not mapping_file.exists():
        logger.warning(f"⚠️  Fichier {mapping_file} non trouvé, fallback sera utilisé")
    
    # Exécuter les tests
    success = asyncio.run(main())
    sys.exit(0 if success else 1)