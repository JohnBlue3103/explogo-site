#!/bin/bash
# Exporte les lieux validés de la base de PROD vers outils/donnees/lieux.jsonl
# (hors Git : ce fichier contient le début des récits, il ne doit pas être publié).
# Ensuite :  node outils/patrimoine.js
set -e
cd "$(dirname "$0")"
mkdir -p donnees
ssh ubuntu@51.38.235.203 'E=$(sudo docker exec explogo-backend env); U=$(echo "$E"|grep -E "^SPRING_DATASOURCE_USERNAME="|cut -d= -f2-); P=$(echo "$E"|grep -E "^SPRING_DATASOURCE_PASSWORD="|cut -d= -f2-);
echo "SELECT JSON_OBJECT(\"id\",id,\"c\",categorie,\"nom\",nom,\"commune\",commune,\"dep\",departement,\"lat\",latitude,\"lon\",longitude,\"siecle\",siecle,\"proprio\",JSON_VALUE(extra,\"\$.proprietaire\"),\"wd\",wikidata_id,\"desc\",LEFT(description,700)) FROM poi WHERE status=\"VALIDE\";" \
 | sudo docker run --rm -i mariadb:11 mariadb -h gc1401762-001.eu.clouddb.ovh.net -P 35922 -u"$U" -p"$P" explogo-ovh -N -r --default-character-set=utf8mb4' > donnees/lieux.jsonl
echo "$(wc -l < donnees/lieux.jsonl) lieux exportés dans outils/donnees/lieux.jsonl"
