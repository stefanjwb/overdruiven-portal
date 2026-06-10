import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { FileButton, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPhoto } from '@tabler/icons-react';

interface Props {
  /** Initiële HTML-inhoud (alleen gelezen bij mount). */
  initialContent: string;
  onChange: (html: string) => void;
}

export default function BlogEditor({ initialContent, onChange }: Props) {
  const editor = useEditor({
    // Vereist bij React.StrictMode (zie main.tsx): zonder dit rendert TipTap de
    // editor direct tijdens de render-fase, wat met React 18 crasht bij interactie.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link,
      Image.configure({ inline: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Schrijf hier je blogpost...' }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const insertImage = (file: File | null) => {
    if (!file || !editor) return;
    if (file.size > 5 * 1024 * 1024) {
      notifications.show({ message: 'Afbeelding in de tekst mag maximaal 5 MB zijn.', color: 'red' });
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };

  return (
    <RichTextEditor editor={editor} style={{ minHeight: 280 }}>
      <RichTextEditor.Toolbar sticky stickyOffset={60}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.Blockquote />
          <RichTextEditor.Hr />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.BulletList />
          <RichTextEditor.OrderedList />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
          <FileButton onChange={insertImage} accept="image/*">
            {props => (
              <Tooltip label="Afbeelding invoegen">
                <RichTextEditor.Control {...props} aria-label="Afbeelding invoegen">
                  <IconPhoto size={16} stroke={1.5} />
                </RichTextEditor.Control>
              </Tooltip>
            )}
          </FileButton>
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.AlignLeft />
          <RichTextEditor.AlignCenter />
          <RichTextEditor.AlignRight />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content />
    </RichTextEditor>
  );
}
