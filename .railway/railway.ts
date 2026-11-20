import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "squishy-kingdom";
export default defineRailway(() => {
  const squishyKingdom = service("squishy-kingdom", {
    source: github("andreduval-cmd/squishy-kingdom", { branch: "feature/live-multiplayer", upstreamUrl: "https://github.com/andreduval-png/squishy-kingdom" }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/health",
    healthcheckTimeout: 60,
    replicas: { "sfo": 1 },
  });

  return project("imaginative-cat", {
    variables: { managed: false },
    resources: [squishyKingdom],
  });
});
