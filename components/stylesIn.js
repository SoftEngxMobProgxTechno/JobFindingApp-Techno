import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  // Existing styles
  container: {
    flex: 1,
    backgroundColor: "#F6F8FF",
  },

  scrollContent: {
    flex: 1,
    padding: 12,
    paddingBottom: 90,
    minHeight: "100%",
    backgroundColor: "#F6F8FF",
  },

  // Existing drawer styles
  menuOverlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  backdrop: {
    flex: 1,
  },

  menuContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "80%",
    backgroundColor: "#FFFFFF",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  safeArea: {
    flex: 1,
    justifyContent: "space-between",
  },

  menuHeader: {
    paddingTop: 34,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },

  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#2623D3",
  },

  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },

  userEmail: {
    fontSize: 12,
    color: "#6B7280",
  },

  closeMenuBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  menuActsContainer: {
    flex: 1,
    backgroundColor: "green",
    justifyContent: "flex-start",
    alignItems: "center",
    flexDirection: "column",
  },

  menuFooter: {
    padding: 16,
  },

  logoutButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#d81111",
    alignSelf: "center",
  },

  // Home screen styles.
  homeContainer: {
    flex: 1,
    backgroundColor: "#F6F8FF",
  },

  homeContent: {
    padding: 12,
  },

  homeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  homeMorning: {
    color: "#6D7A9B",
    fontSize: 13,
  },

  homeGreeting: {
    color: "#111C4B",
    fontSize: 25,
    fontWeight: "800",
    marginTop: 3,
  },

  homeSubtitle: {
    color: "#7381A2",
    fontSize: 12,
    marginTop: 8,
  },

  homeBell: {
    backgroundColor: "#FFFFFF",
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  homeSearchRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 27,
    marginBottom: 25,
  },

  homeSearchBox: {
    flex: 1,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#EEF0F8",
  },

  homeSearchInput: {
    flex: 1,
    color: "#1D2A50",
    fontSize: 14,
    fontWeight: '500'
  },

  homeFilter: {
    width: 48,
    height: 48,
    backgroundColor: "#2623D3",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  homeSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  homeHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flexShrink: 1,
  },

  homeHeading: {
    color: "#111C4B",
    fontSize: 17,
    fontWeight: "800",
  },

  homeSeeAll: {
    color: "#2623D3",
    fontSize: 12,
    fontWeight: "600",
  },

  homeHorizontal: {
    gap: 12
  },

  // Employer Header & Modal Styles
  employerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  employerHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111C4B",
  },

  employerHeaderSubtitle: {
    fontSize: 12,
    color: "#7381A2",
    marginTop: 4,
  },

  employerPostBtn: {
    backgroundColor: "#2623D3",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#2623D3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  employerPostBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  employerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 28, 75, 0.5)",
    justifyContent: "flex-end",
  },

  employerModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: "85%",
  },

  employerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  employerModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111C4B",
  },

  employerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15204A",
    marginBottom: 6,
    marginTop: 12,
  },

  employerInput: {
    borderWidth: 1,
    borderColor: "#EEF0F8",
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    backgroundColor: "#F6F8FF",
    color: "#111C4B",
  },

  employerSubmitBtn: {
    backgroundColor: "#2623D3",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
    shadowColor: "#2623D3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },

  employerSubmitBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  // Job Details styles.
  detailsContainer: {
    flex: 1,
    backgroundColor: "#F6F8FF",
  },

  detailsContent: {
    padding: 20,
    paddingBottom: 30,
  },

  detailsTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 23,
  },

  detailsBack: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  detailsTopTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#15204A",
  },

  detailsHero: {
    backgroundColor: "#FFFFFF",
    padding: 25,
    borderRadius: 23,
    alignItems: "center",
    marginBottom: 15,
  },

  detailsLogo: {
    width: 75,
    height: 75,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  detailsTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#121C46",
    textAlign: "center",
  },

  detailsCompany: {
    color: "#2623D3",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },

  detailsLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 9,
  },

  detailsFacts: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 15,
  },

  detailsFact: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 17,
    alignItems: "flex-start",
    gap: 7,
  },

  detailsFactLabel: {
    color: "#8590A5",
    fontSize: 12,
  },

  detailsFactValue: {
    color: "#2623D3",
    fontSize: 14,
    fontWeight: "700",
  },

  detailsPanel: {
    backgroundColor: "#FFFFFF",
    padding: 19,
    borderRadius: 17,
    marginBottom: 13,
  },

  detailsSectionTitle: {
    color: "#15204A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  detailsBody: {
    color: "#6C7893",
    fontSize: 13,
    lineHeight: 21,
  },

  detailsSalary: {
    color: "#2623D3",
    fontSize: 17,
    fontWeight: "700",
  },

  detailsRequirement: {
    color: "#6C7893",
    fontSize: 13,
    lineHeight: 24,
  },

  detailsFooter: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },

  detailsApply: {
    backgroundColor: "#2623D3",
    borderRadius: 100,
    padding: 17,
    alignItems: "center",
  },

  detailsApplyText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // JobCard styles.
  jobCardFeatured: {
    width: 290,
    backgroundColor: "#2623D3",
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    flexDirection: "column",
    gap:16,
  },

  jobCardFeaturedTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  jobCardFeaturedIcon: {
    width: 45,
    height: 45,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  jobCardFeaturedTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  jobCardFeaturedCompany: {
    color: "#c2cade",
    fontSize: 12,
  },

  jobCardFeaturedMid:{
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  jobCardLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  jobCardTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },

  jobCardFeaturedLocation: {
    color: "#c2cade",
    fontSize: 12,
  },

  jobCardFeaturedTime: {
    color: "#c2cade",
    fontSize: 12,
  },

  jobCardFeaturedBottom: {
    flexDirection: "row",
    marginTop: 'auto',
    gap: 8,
  },

  jobCardFeaturedTag: {
    color: "#FFFFFF",
    backgroundColor: "#4947E8",
    fontWeight: 500,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 11,
  },

  jobCardFeaturedSalary: {
    color: "#FFFFFF",
    fontSize: 11,
    flex: 1,
    textAlign: "right",
  },

  jobCardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF0F8",
  },

  jobCardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },

  jobCardInfo: {
    flex: 1,
    gap: 4,
  },

  jobCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111C4B",
  },

  jobCardCompany: {
    fontSize: 12,
    color: "#7381A2",
  },

  jobCardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },

  jobCardTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2623D3",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  jobCardRight: {
    flexDirection: "column",
    justifyContent: "space-between"
  },

  jobCardSalary: {
    color: "#2623D3",
    fontSize: 11,
    alignSelf: "baseline",

  },
  employerModalContainer: {
    flex: 1,
    backgroundColor: "#F6F8FF",
  },
  employerModalTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: "#F6F8FF",
    borderBottomWidth: 1,
    borderColor: "#EEF0F8",
  },
  employerCloseModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F6F8FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF0F8",
  },
  employerToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  employerToggleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  employerToggleChipActive: {
    backgroundColor: "#2623D3",
    borderColor: "#2623D3",
  },
  employerToggleChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },
  employerToggleChipTextActive: {
    color: "#FFFFFF",
  },
  employerSalaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  employerCurrencyBox: {
    height: 44,
    width: 38,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  employerCurrencyText: {
    fontWeight: "800",
    color: "#2623D3",
    fontSize: 14,
  },
  employerIntervalBadge: {
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  employerIntervalText: {
    fontWeight: "800",
    color: "#2623D3",
    fontSize: 12,
  },
  employerSkillInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF0F8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
  },
  employerAddSkillBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#2623D3",
    justifyContent: "center",
    alignItems: "center",
  },
  employerSuggestionsDropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF0F8",
    marginTop: 4,
    padding: 6,
    gap: 4,
  },
  employerSuggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F6F8FF",
  },
  employerSuggestionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111C4B",
  },
  employerPillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  employerSkillPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  employerSkillPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },

  // details/[id].jsx styles
  // Add these inside your existing stylesheet object in stylesIn.js:
  detailsHeaderBanner: {
    backgroundColor: "#2623D3",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailsHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailsScrollContent: {
    paddingTop: 30,
    paddingBottom: 0,
    gap: 16,
  },
  jobDetailsCard: {
    backgroundColor: "#F6F8FF",
    borderTopEndRadius: 20,
    borderTopStartRadius: 20,
    marginTop: 25,
    minHeight:"100%",
    gap: 6
  },
  jobDetailsPfp: {
    position: "absolute",
    top: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF0F8",
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: "#FFFFFF",
  },

  jobDetailsInitialText: {
    color: "#2623D3",
    fontSize: 26,
    fontWeight: "800",
  },
  jobDetailsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111C4B",
    textAlign: "center",

  },
  jobDetailsCompany: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2623D3",
    textAlign: "center",
  },
  detailsStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  detailsStatBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF0F8",
    justifyContent: "space-between",
    gap: 12,
  },
  detailsStatIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsStatLabel: {
    fontSize: 11,
    color: "#8590A5",
    fontWeight: "600",
    marginBottom: 2,
  },
  detailsStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111C4B",
  },
  detailsCardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF0F8",
    width: '100%',
  },
  detailsSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    
  },
  detailsReqItemBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF0F8",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  detailsReqCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#111C4B",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsSkillBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  detailsSkillBadgeText: {
    color: "#2623D3",
    fontSize: 12,
    fontWeight: "700",
  },

  // jobApps style
  jobAppsHeading: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111C4B",
  },
  jobAppsSubtitle: {
    fontSize: 13,
    color: "#5B6788",
    marginTop: 6,
  },
  jobAppsStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  jobAppsStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EDF0F7",
  },
  jobAppsStatMain: {
    backgroundColor: "#2623D3",
    borderColor: "#2623D3",
  },
  jobAppsStatNumber: {
    fontSize: 26,
    fontWeight: "800",
  },
  jobAppsStatLabel: {
    fontSize: 12,
    color: "#5B6788",
    marginTop: 4,
  },
  jobAppsChipRow: {
    marginTop: 20,
    marginBottom: 16,
    flexGrow: 0,
  },
  jobAppsChip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  jobAppsChipActive: {
    backgroundColor: "#2623D3",
    borderColor: "#2623D3",
  },
  jobAppsChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111C4B",
  },
  jobAppsChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  jobAppsEmptyContainer: {
    alignItems: "center",
    paddingVertical: 50,
    gap: 8,
  },
  jobAppsEmptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111C4B",
  },
  jobAppsEmptyBody: {
    fontSize: 13,
    color: "#5B6788",
  },
  jobAppsEmptyButton: {
    marginTop: 10,
    backgroundColor: "#2623D3",
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 26,
  },
  jobAppsEmptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  quickCatSection: {
    marginBottom: 20,
  },
  quickCatLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7381A2",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickCatRow: {
    gap: 8,
  },
  quickCatPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF0F8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
  },
  quickCatPillActive: {
    backgroundColor: "#2623D3",
    borderColor: "#2623D3",
  },
  quickCatPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },
  quickCatPillTextActive: {
    color: "#FFFFFF",
  },
  savedHeader: {
    marginBottom: 18,
  },
  savedListContainer: {
    gap: 12,
  },
  savedEmptyBody: {
    fontSize: 13,
    color: "#5B6788",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  profileHeader: {
    marginBottom: 18,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF0F8",
    marginBottom: 18,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2623D3",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111C4B",
  },
  profileEmail: {
    fontSize: 13,
    color: "#7381A2",
    marginTop: 2,
  },
  profileRoleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  profileRoleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2623D3",
  },
  profileEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF0F8",
    marginBottom: 20,
  },
  profileCompletionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileCompletionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111C4B",
  },
  profileCompletionPct: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2623D3",
  },
  profileBarBg: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    overflow: "hidden",
  },
  profileBarFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#2623D3",
  },
  profileCompletionHint: {
    fontSize: 11,
    color: "#7381A2",
    marginTop: 10,
    lineHeight: 17,
  },
  profileInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  profileInfoLabel: {
    width: 85,
    fontSize: 12,
    color: "#7381A2",
  },
  profileInfoValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#111C4B",
    textAlign: "right",
  },
  profileBioSection: {
    borderTopWidth: 1,
    borderTopColor: "#EEF0F8",
    paddingTop: 14,
    marginTop: 8,
  },
  profileBio: {
    fontSize: 12,
    color: "#5B6788",
    lineHeight: 19,
    marginTop: 4,
  },
  profileChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  profileChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2623D3",
  },
  profileEmptyText: {
    fontSize: 12,
    color: "#8993A8",
    marginBottom: 8,
  },
  profileSkillInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  profileAddSkillBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2623D3",
    alignItems: "center",
    justifyContent: "center",
  },
  profileMenuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#EEF0F8",
    marginBottom: 24,
    overflow: "hidden",
  },
  profileMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  profileRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F8",
  },
  profileMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileMenuLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111C4B",
  },
  profileMenuHint: {
    fontSize: 11,
    color: "#8993A8",
    marginTop: 3,
  },
  profileModalShade: {
    flex: 1,
    backgroundColor: "rgba(17, 28, 75, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  profileModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  profileFieldGroup: {
    marginBottom: 14,
  },
  profileFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15204A",
    marginBottom: 6,
  },
  profileInput: {
    height: 44,
    backgroundColor: "#F6F8FF",
    borderWidth: 1,
    borderColor: "#EEF0F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#111C4B",
  },
  profileInputMultiline: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  profileSaveBtn: {
    backgroundColor: "#2623D3",
    borderRadius: 15,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  profileSaveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F8",
  },
  profileSettingText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#111C4B",
  },
  profileNote: {
    fontSize: 11,
    color: "#8993A8",
    lineHeight: 17,
  },
  profileResumeBox: {
    alignItems: "center",
    gap: 10,
    padding: 20,
    borderRadius: 14,
    backgroundColor: "#F6F8FF",
    borderWidth: 1,
    borderColor: "#EEF0F8",
    marginBottom: 12,
  },
  profileResumeName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111C4B",
    textAlign: "center",
  },
  profileRemoveResumeBtn: {
    padding: 14,
    alignItems: "center",
  },
  profileRemoveResumeText: {
    color: "#d81111",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default styles;