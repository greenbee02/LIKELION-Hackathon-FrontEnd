import * as DialogPrimitive from '@rn-primitives/dialog';
import { StyleSheet, View } from 'react-native';

import { Button } from './button';
import { GlassSurface } from './glass-surface';
import { allowPressOverflow } from './press-scale';
import { Text } from './text';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/radius';
import { space } from '@/theme/spacing';

/**
 * A question the app has to ask before it does something it cannot undo.
 *
 * Controlled rather than triggered: a confirmation is opened by an action the caller already owns
 * a button for, and a `Trigger` here would mean every call site wrapping a control it has already
 * styled. Behaviour — the portal, the focus trap, escape and outside-press dismissal — is
 * `@rn-primitives/dialog`; the surface is ours, and it is glass, like every other thing in this
 * app that floats over a page.
 *
 * **It has a scrim, and it is the only floating surface that does.** A menu can be dismissed by
 * ignoring it, so the page underneath stays live; a dialog is a question, and a question the
 * customer can reach past is not one. The scrim is `scrimInk` — the same ink the card's face
 * uses over artwork — because a scrim is not a colour, it is darkness with a job.
 *
 * **The safe answer is the loud one.** Everywhere else `solid` marks the thing the screen wants
 * you to do, and on a screen asking whether to delete an account that thing is *not* deleting the
 * account. Making the destructive button `outline` is the same rule applied honestly rather than
 * a second convention — the palette has no red to spend, so weight is the only thing left to say
 * it with, and spending it on the destructive button would say the opposite.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  cancelLabel = '취소',
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  pending?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay style={styles.overlay}>
          {/* A layer of its own, not a translucent background on the overlay: opacity set on the
              overlay would dim the panel with it, and the panel is the one thing that must not
              be dimmed. Same construction as the card face's scrim, for the same reason. */}
          <View style={styles.scrim} pointerEvents="none" />
          <DialogPrimitive.Content style={styles.anchor}>
            <GlassSurface borderRadius={radius.base} style={styles.panel}>
              <View style={styles.body}>
                <DialogPrimitive.Title asChild>
                  <Text variant="heading">{title}</Text>
                </DialogPrimitive.Title>
                <DialogPrimitive.Description asChild>
                  <Text variant="body" tone="muted" style={styles.description}>
                    {description}
                  </Text>
                </DialogPrimitive.Description>

                {/* Stacked rather than side by side. Two 52pt controls in a row on a narrow phone
                    leave each about 130pt, which is not enough for a destructive verb and forces
                    the label to shrink to something vaguer than what it does. */}
                <View style={styles.actions}>
                  <Button label={cancelLabel} onPress={() => onOpenChange(false)} />
                  <Button
                    label={confirmLabel}
                    variant="outline"
                    onPress={onConfirm}
                    loading={pending}
                  />
                </View>
              </View>
            </GlassSurface>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const styles = StyleSheet.create({
  /* Fills the window, dims it, and centres the panel. Pressing it dismisses — for a destructive
     question the outside press lands on the safe answer, which is the only reason it is allowed. */
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  /* 0.5 — enough that the page behind reads as out of reach, not so much that the customer loses
     track of what they were looking at when they hit the button. */
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.scrimInk,
    opacity: 0.5,
  },
  anchor: { width: '100%', maxWidth: 340, ...allowPressOverflow },
  panel: allowPressOverflow,
  body: { padding: space[5] },
  description: { marginTop: space[2] },
  actions: { marginTop: space[5], gap: space[3], ...allowPressOverflow },
});
