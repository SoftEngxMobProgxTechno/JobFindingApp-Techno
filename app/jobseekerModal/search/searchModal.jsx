import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import styles from "../../../components/stylesIn";
import { supabase } from "../../../lib/supabase";

const JOB_TYPES = [
  "All",
  "Full-Time",
  "Part-Time",
  "Internship / OJT",
  "Contract",
];

const POPULAR_SKILLS = [
  "React Native",
  "JavaScript",
  "Python",
  "UI/UX Design",
  "Figma",
  "SQL",
  "Customer Service",
  "Microsoft Excel",
];

export default function SearchModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollRef = useRef(null);

  const initialSkills = useMemo(() => {
    if (!params.skill) return [];
    return String(params.skill)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [params.skill]);

  const [query, setQuery] = useState(String(params.query || ""));
  const [selectedType, setSelectedType] = useState(
    String(params.jobType || "All")
  );
  const [location, setLocation] = useState(String(params.location || ""));
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState(initialSkills);
  const [showFilters, setShowFilters] = useState(true);

  // Live data from Supabase for instant autocomplete suggestions
  const [allJobs, setAllJobs] = useState([]);

  useEffect(() => {
    let active = true;

    const loadSuggestions = async () => {
      const { data, error } = await supabase
        .from("jobLists")
        .select(`
          title,
          location,
          skills,
          profiles:employer_id ( name )
        `)
        .eq("status", "Open")
        .eq("is_archived", false);

      if (active && !error && data) {
        setAllJobs(data);
      }
    };

    loadSuggestions();
    return () => {
      active = false;
    };
  }, []);

  // Keyword suggestions (titles & companies)
  const keywordSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const matches = new Set();
    allJobs.forEach((job) => {
      if (job.title && job.title.toLowerCase().includes(q)) {
        matches.add(job.title.trim());
      }
      const company = job.profiles?.name;
      if (company && company.toLowerCase().includes(q)) {
        matches.add(company.trim());
      }
    });

    return Array.from(matches)
      .filter((item) => item.toLowerCase() !== q)
      .slice(0, 5);
  }, [query, allJobs]);

  // Unique available locations from active jobs
  const locationSuggestions = useMemo(() => {
    const loc = location.trim().toLowerCase();
    const uniqueLocs = Array.from(
      new Set(allJobs.map((j) => j.location?.trim()).filter(Boolean))
    );

    if (!loc) return uniqueLocs.slice(0, 4);
    return uniqueLocs
      .filter(
        (item) =>
          item.toLowerCase().includes(loc) && item.toLowerCase() !== loc
      )
      .slice(0, 4);
  }, [location, allJobs]);

  // Unique available skills from active jobs + popular defaults
  const availableSkills = useMemo(() => {
    const skillSet = new Set(POPULAR_SKILLS);
    allJobs.forEach((job) => {
      const list = Array.isArray(job.skills)
        ? job.skills
        : job.skills
        ? String(job.skills).split(",")
        : [];
      list.forEach((s) => {
        const cleaned = String(s).trim();
        if (cleaned) skillSet.add(cleaned);
      });
    });

    const input = skillInput.trim().toLowerCase();
    return Array.from(skillSet)
      .filter(
        (s) =>
          !selectedSkills.some(
            (sel) => sel.toLowerCase() === s.toLowerCase()
          ) && (!input || s.toLowerCase().includes(input))
      )
      .slice(0, 6);
  }, [allJobs, skillInput, selectedSkills]);

  const addSkill = (rawSkill) => {
    const cleaned = String(rawSkill || skillInput).trim();
    if (!cleaned) return;

    const exists = selectedSkills.some(
      (s) => s.toLowerCase() === cleaned.toLowerCase()
    );
    if (!exists) {
      setSelectedSkills((prev) => [...prev, cleaned]);
    }
    setSkillInput("");
  };

  const removeSkill = (skillToRemove) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSearch = () => {
    const finalSkills = [...selectedSkills];
    const pendingSkill = skillInput.trim();
    if (
      pendingSkill &&
      !finalSkills.some((s) => s.toLowerCase() === pendingSkill.toLowerCase())
    ) {
      finalSkills.push(pendingSkill);
    }

    router.replace({
      pathname: "/jobseekerModal/search/searchedDisplay",
      params: {
        query: query.trim(),
        jobType: selectedType,
        location: location.trim(),
        skill: finalSkills.join(", "),
      },
    });
  };

  const handleReset = () => {
    setQuery("");
    setSelectedType("All");
    setLocation("");
    setSkillInput("");
    setSelectedSkills([]);
  };

  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedType !== "All" ||
    location.trim().length > 0 ||
    selectedSkills.length > 0 ||
    skillInput.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* Top Interactive Search Bar */}
        <View style={[styles.employerModalTopBar, { gap: 8, paddingTop: 8 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color="#111C4B" />
          </TouchableOpacity>

          <View style={styles.homeSearchBox}>
            <Feather name="search" size={18} color="#7D87A0" />
            <TextInput
              style={styles.homeSearchInput}
              placeholder="Search job title, skill or company..."
              placeholderTextColor="#9299AB"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Feather name="x-circle" size={17} color="#9299AB" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.homeFilter,
              !showFilters && {
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#EEF0F8",
              },
            ]}
            onPress={() => setShowFilters((prev) => !prev)}
          >
            <Feather
              name="sliders"
              size={19}
              color={showFilters ? "#FFFFFF" : "#2623D3"}
            />
          </TouchableOpacity>
        </View>

        {/* Scrollable Filter Area */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, gap: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Live Keyword Autocomplete Dropdown */}
          {keywordSuggestions.length > 0 && (
            <View style={styles.employerSuggestionsDropdown}>
              {keywordSuggestions.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.employerSuggestionItem}
                  onPress={() => setQuery(item)}
                >
                  <Feather name="search" size={14} color="#2623D3" />
                  <Text style={styles.employerSuggestionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Header & Reset All Action */}
          {hasActiveFilters && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={styles.homeSubtitle}>Filters & keywords applied</Text>
              <TouchableOpacity onPress={handleReset} hitSlop={8}>
                <Text style={styles.homeSeeAll}>Reset All</Text>
              </TouchableOpacity>
            </View>
          )}

          {showFilters && (
            <>
              {/* Job Type Filter Chips */}
              <View>
                <Text style={styles.employerLabel}>Job Type</Text>
                <View style={styles.employerToggleRow}>
                  {JOB_TYPES.map((type) => {
                    const active = selectedType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.employerToggleChip,
                          active && styles.employerToggleChipActive,
                        ]}
                        onPress={() => setSelectedType(type)}
                      >
                        <Text
                          style={[
                            styles.employerToggleChipText,
                            active && styles.employerToggleChipTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Location Filter */}
              <View>
                <Text style={styles.employerLabel}>Location</Text>
                <View style={styles.homeSearchBox}>
                  <Feather name="map-pin" size={18} color="#7D87A0" />
                  <TextInput
                    style={styles.homeSearchInput}
                    placeholder="City, province, or remote"
                    placeholderTextColor="#9299AB"
                    value={location}
                    onChangeText={setLocation}
                    onFocus={() =>
                      setTimeout(
                        () => scrollRef.current?.scrollTo({ y: 140, animated: true }),
                        150
                      )
                    }
                    returnKeyType="done"
                  />
                  {location.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setLocation("")}
                      hitSlop={8}
                    >
                      <Feather name="x" size={16} color="#9299AB" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Location Suggestions */}
                {locationSuggestions.length > 0 && (
                  <View style={styles.employerPillsContainer}>
                    {locationSuggestions.map((loc) => (
                      <TouchableOpacity
                        key={loc}
                        style={styles.employerSkillPill}
                        onPress={() => setLocation(loc)}
                      >
                        <Feather name="map-pin" size={11} color="#2623D3" />
                        <Text style={styles.employerSkillPillText}>{loc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Skill Filter */}
              <View>
                <Text style={styles.employerLabel}>Specific Skill</Text>
                <View style={styles.employerSkillInputContainer}>
                  <Feather
                    name="code"
                    size={18}
                    color="#7D87A0"
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.homeSearchInput}
                    placeholder="e.g. React Native, Figma, Python"
                    placeholderTextColor="#9299AB"
                    value={skillInput}
                    onChangeText={setSkillInput}
                    onFocus={() =>
                      setTimeout(
                        () => scrollRef.current?.scrollToEnd({ animated: true }),
                        150
                      )
                    }
                    onSubmitEditing={() => addSkill(skillInput)}
                    returnKeyType="done"
                  />
                  {skillInput.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.employerAddSkillBtn}
                      onPress={() => addSkill(skillInput)}
                    >
                      <Feather name="plus" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Selected Skill Pills */}
                {selectedSkills.length > 0 && (
                  <View style={styles.employerPillsContainer}>
                    {selectedSkills.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.employerSkillPill,
                          { backgroundColor: "#2623D3", borderColor: "#2623D3" },
                        ]}
                        onPress={() => removeSkill(item)}
                      >
                        <Text
                          style={[
                            styles.employerSkillPillText,
                            { color: "#FFFFFF" },
                          ]}
                        >
                          {item}
                        </Text>
                        <Feather name="x" size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Suggested Skill Pills */}
                {availableSkills.length > 0 && (
                  <View style={styles.employerPillsContainer}>
                    {availableSkills.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={styles.employerSkillPill}
                        onPress={() => addSkill(item)}
                      >
                        <Feather name="plus" size={12} color="#2623D3" />
                        <Text style={styles.employerSkillPillText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Sticky Bottom Action Bar */}
        <View
          style={{
            backgroundColor: "#F6F8FF",
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 14,
            borderTopWidth: 1,
            borderTopColor: "#EEF0F8",
          }}
        >
          <TouchableOpacity
            style={[styles.employerSubmitBtn, { marginTop: 0, marginBottom: 0 }]}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.employerSubmitBtnText}>Search Jobs</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}