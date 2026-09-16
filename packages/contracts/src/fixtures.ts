import { detailSchema, type Detail } from "./index";
// Fictional examples only. No assertions about real businesses or real registry numbers.
export function createFixtures(): Detail[] {
  return ["supported", "conflicting", "insufficient"].map((assessment, i) => {
    const id = `demo-establishment-${i + 1}`,
      sourceId = `demo-source-${i + 1}`,
      evidenceId = `demo-evidence-${i + 1}`;
    return detailSchema.parse({
      establishment: {
        id,
        name: ["Demo Bakkerij", "Demo Bloemenzaak", "Demo Atelier"][i],
        address: {
          street: "Paalstraat",
          houseNumber: ["DEMO-A", "DEMO-B", "DEMO-C"][i],
          postalCode: "2900",
          municipality: "Schoten",
        },
        parentEnterpriseId:
          i === 2 ? "demo-missing-parent" : `demo-enterprise-${i + 1}`,
        parent:
          i === 2
            ? null
            : {
                id: `demo-enterprise-${i + 1}`,
                legalName: `Demo onderneming ${i + 1}`,
                registeredAddress: {
                  street: "Voorbeeldstraat",
                  houseNumber: "DEMO",
                  postalCode: "2000",
                  municipality: "Antwerpen",
                },
                registryStatus: "Demo: normale toestand",
                sourceId,
              },
        registryStatus: "Demo: geregistreerd",
        sourceId,
        activityAssessment: assessment,
        evidenceIds: [evidenceId],
        proposals: [
          {
            id: `demo-proposal-${i + 1}`,
            establishmentId: id,
            field: "localActivityNote",
            before: null,
            proposedValue: [
              "Aanwijzingen voor lokale activiteit",
              "Openingsuren controleren",
              "Aanvullende controle nodig",
            ][i],
            reasonNl: [
              "Fictief voorbeeld van ondersteunend bewijs.",
              "Fictief voorbeeld van tegenstrijdige bronnen.",
              "Geen bewijs is geen bewijs van sluiting.",
            ][i],
            evidenceIds: [evidenceId],
            revision: 0,
            reviewState: "pending",
          },
        ],
        isDemo: true,
      },
      sources: [
        {
          id: sourceId,
          url: "https://example.com",
          publisher: "Fictieve demonstratiebron",
          kind: "website",
          retrievedAt: "2026-09-16T08:00:00.000Z",
          observedAt: null,
          registrySnapshotDate: null,
          cached: true,
          isDemo: true,
        },
      ],
      evidence: [
        {
          id: evidenceId,
          establishmentId: id,
          sourceId,
          excerpt: [
            "Demo: adres en dienstverlening vermeld.",
            "Demo: bron A en bron B spreken elkaar tegen.",
            "Demo: onvoldoende informatie beschikbaar.",
          ][i],
          field: "localActivityNote",
          observedValue: null,
          scope: "local",
          assessment: ["supports", "conflicts", "insufficient"][i],
        },
      ],
      reviews: [],
    });
  });
}
export function fixtureCoverage() {
  return {
    mode: "fixtures" as const,
    labelNl: "3 fictieve oefencases — geen echte bedrijfsgegevens",
    completeMunicipality: false,
    registrySnapshotDate: null,
  };
}
