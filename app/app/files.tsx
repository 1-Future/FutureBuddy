// Copyright 2025 #1 Future — Apache 2.0 License

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { listFiles, readFile } from "../src/services/api";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
  extension?: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function FilesScreen() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("C:\\");
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await listFiles(path);
      setEntries(result.entries);
      setCurrentPath(result.path);
      setParentPath(result.parent);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handlePress = useCallback(
    async (entry: FileEntry) => {
      if (entry.type === "directory") {
        loadDirectory(entry.path);
      } else {
        try {
          const result = await readFile(entry.path);
          Alert.alert(
            entry.name,
            result.content.slice(0, 500) + (result.content.length > 500 ? "\n..." : ""),
          );
        } catch (err: any) {
          Alert.alert("Error", err.message);
        }
      }
    },
    [loadDirectory],
  );

  const renderEntry = useCallback(
    ({ item }: { item: FileEntry }) => (
      <TouchableOpacity style={styles.entry} onPress={() => handlePress(item)}>
        <Text style={styles.entryIcon}>{item.type === "directory" ? "📁" : "📄"}</Text>
        <View style={styles.entryInfo}>
          <Text style={styles.entryName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.entryMeta}>
            {item.type === "file" ? formatSize(item.size) : "Directory"}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [handlePress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.pathBar}>
        {parentPath && (
          <TouchableOpacity style={styles.backButton} onPress={() => loadDirectory(parentPath)}>
            <Text style={styles.backText}>← Up</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.pathText} numberOfLines={1}>
          {currentPath}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#4fc3f7" size="large" />
      ) : (
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  pathBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  backButton: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  backText: { color: "#4fc3f7", fontWeight: "bold" },
  pathText: { color: "#888", fontSize: 13, flex: 1, fontFamily: "monospace" },
  loader: { flex: 1, justifyContent: "center" },
  list: { padding: 8 },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
  },
  entryIcon: { fontSize: 22, marginRight: 12 },
  entryInfo: { flex: 1 },
  entryName: { color: "#e0e0e0", fontSize: 15 },
  entryMeta: { color: "#666", fontSize: 12, marginTop: 2 },
});
