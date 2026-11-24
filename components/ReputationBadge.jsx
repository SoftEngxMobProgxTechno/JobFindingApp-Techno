
import { Text, View } from "react-native";
import { getReputationTier } from "../lib/employer/reputation";

export default function ReputationBadge({ score, compact = false }) {
  if (score === null || score === undefined) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>No reputation yet</Text>
      </View>
    );
  }

  const tier = getReputationTier(Number(score));

  const tierColors = {
    "Highly Reliable": "#15803D",
    Reliable: "#2563EB",
    Fair: "#B45309",
    "Needs Improvement": "#C2410C",
    "Poor Reliability": "#DC2626",
  };

  const color = tierColors[tier] || "#64748B";

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />

      <Text style={[styles.text, { color }]}>
        {compact ? `${score}/100` : `${tier} · ${score}/100`}
      </Text>
    </View>
  );
}

const styles = {
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
  muted: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
};
