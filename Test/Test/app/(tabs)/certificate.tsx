import { ApiError } from "@/services/api";
import {
  certificateApi,
  type AchieverDto,
  type CertificateEligibilityDto,
} from "@/services/certificateApi";
import type { RootState } from "@/store";
import { Award, CheckCircle2, LockKeyhole } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

const Certificate = () => {
  const colors = useSelector((state: RootState) => state.theme.colors);
  const [eligibility, setEligibility] = useState<CertificateEligibilityDto | null>(null);
  const [achievers, setAchievers] = useState<AchieverDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([certificateApi.eligibility(), certificateApi.achievers()])
      .then(([eligibilityData, achieverData]) => {
        if (cancelled) return;
        setEligibility(eligibilityData);
        setAchievers(achieverData);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof ApiError ? reason.message : "Couldn't load certificate progress.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remaining = eligibility
    ? Math.max(0, eligibility.required_catches - eligibility.total_catches)
    : 0;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Certificate</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your real catch milestone progress.</Text>

        {loading && <ActivityIndicator color={colors.accent} style={styles.loader} />}
        {!loading && error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

        {!loading && !error && eligibility && (
          <>
            <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.icon, { backgroundColor: eligibility.eligible ? `${colors.accent}22` : colors.surfaceContainer }]}>
                {eligibility.eligible ? <CheckCircle2 size={30} color={colors.accent} /> : <LockKeyhole size={30} color={colors.mutedForeground} />}
              </View>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                {eligibility.eligible ? "Eligible for the certificate" : "Keep logging your catches"}
              </Text>
              <Text style={[styles.count, { color: colors.accent }]}>
                {eligibility.total_catches} / {eligibility.required_catches}
              </Text>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                {eligibility.eligible ? "Your 100-catch milestone is complete." : `${remaining} more record${remaining === 1 ? "" : "s"} required.`}
              </Text>
            </View>

            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionTitleRow}>
                <Award size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievers</Text>
              </View>
              {achievers.length === 0 ? (
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>No users have reached 100 catches yet.</Text>
              ) : achievers.map((achiever) => (
                <View key={achiever.user_id} style={[styles.achiever, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.achieverName, { color: colors.foreground }]}>{achiever.name}</Text>
                    <Text style={[styles.achieverEmail, { color: colors.mutedForeground }]}>{achiever.email}</Text>
                  </View>
                  <Text style={[styles.achieverCount, { color: colors.accent }]}>{achiever.total_catches}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 120 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4, marginBottom: 20 },
  loader: { marginTop: 32 },
  error: { fontSize: 15, lineHeight: 22 },
  hero: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: "center" },
  icon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  heroTitle: { fontSize: 20, lineHeight: 26, fontWeight: "800", textAlign: "center" },
  count: { fontSize: 38, lineHeight: 46, fontWeight: "800", marginTop: 14 },
  helper: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 4 },
  section: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800" },
  empty: { fontSize: 14, lineHeight: 20, paddingVertical: 12 },
  achiever: { borderTopWidth: 1, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  achieverName: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  achieverEmail: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  achieverCount: { fontSize: 16, lineHeight: 22, fontWeight: "800" },
});

export default Certificate;
