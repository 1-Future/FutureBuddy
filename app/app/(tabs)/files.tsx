import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as api from '../../src/services/api';
import type { FileEntry } from '../../src/types/models';
import { colors } from '../../src/theme/tokens';

function formatSize(bytes: number): string {
  if (bytes === 0) return '\u2014';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export default function FilesScreen() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('C:\\');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const result = await api.listFiles(path);
      setEntries(result.entries);
      setCurrentPath(result.path);
      setParentPath(result.parent);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handlePress = useCallback(
    async (entry: FileEntry) => {
      if (entry.type === 'directory') {
        loadDirectory(entry.path);
      } else {
        try {
          const result = await api.readFile(entry.path);
          Alert.alert(
            entry.name,
            result.content.slice(0, 500) + (result.content.length > 500 ? '\n...' : ''),
          );
        } catch (err: any) {
          Alert.alert('Error', err.message);
        }
      }
    },
    [loadDirectory],
  );

  const renderEntry = useCallback(
    ({ item }: { item: FileEntry }) => (
      <Pressable style={styles.entry} onPress={() => handlePress(item)}>
        <View style={styles.iconContainer}>
          <Feather
            name={item.type === 'directory' ? 'folder' : 'file-text'}
            size={20}
            color={item.type === 'directory' ? colors.accent : colors.textMuted}
          />
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.entryMeta}>
            {item.type === 'file' ? formatSize(item.size) : 'Directory'}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </Pressable>
    ),
    [handlePress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.pathBar}>
        {parentPath && (
          <Pressable style={styles.backButton} onPress={() => loadDirectory(parentPath)}>
            <Feather name="arrow-left" size={16} color={colors.accent} />
          </Pressable>
        )}
        <Text style={styles.pathText} numberOfLines={1}>
          {currentPath}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} size="large" />
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
  container: { flex: 1, backgroundColor: colors.bg },
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    backgroundColor: colors.bgElevated,
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  pathText: { color: colors.textMuted, fontSize: 13, flex: 1, fontFamily: 'monospace' },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: 4 },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSurface,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryInfo: { flex: 1 },
  entryName: { color: colors.text, fontSize: 15 },
  entryMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
