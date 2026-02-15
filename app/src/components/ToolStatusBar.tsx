import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import type { ToolActivity } from '../stores/chat.store';

interface ToolStatusBarProps {
  activities: ToolActivity[];
}

function formatToolName(name: string): string {
  return name.replace('__', '.');
}

export default function ToolStatusBar({ activities }: ToolStatusBarProps) {
  if (activities.length === 0) return null;

  return (
    <View style={styles.container}>
      {activities.map((activity) => (
        <View key={activity.tool_call_id} style={styles.row}>
          {activity.status === 'running' ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.indicator} />
          ) : activity.status === 'done' ? (
            <Feather name="check-circle" size={14} color={colors.success} style={styles.icon} />
          ) : (
            <Feather name="x-circle" size={14} color={colors.error} style={styles.icon} />
          )}
          <Text style={styles.text} numberOfLines={1}>
            {activity.status === 'running'
              ? `Running ${formatToolName(activity.tool_name)}...`
              : activity.status === 'done'
                ? `${formatToolName(activity.tool_name)} done`
                : `${formatToolName(activity.tool_name)} failed`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  indicator: {
    marginRight: 8,
    transform: [{ scale: 0.7 }],
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
  },
});
