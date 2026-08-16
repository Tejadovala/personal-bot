import { AnimatePresence, motion } from 'framer-motion';
import PHeading from './PHeading';
import PText from './PText';
import PButton from './PButton';
import PTextInput from './PTextInput';
import POptionCard from './POptionCard';
import PImagePlaceholder from './PImagePlaceholder';
import PHeroImage from './PHeroImage';
import PNavBar from './PNavBar';
import PTabBar from './PTabBar';
import PListItem from './PListItem';
import PCard from './PCard';
import PDivider from './PDivider';
import PSpacer from './PSpacer';
import PPricingTier from './PPricingTier';
import PModal from './PModal';
import PToggle from './PToggle';
import PAvatar from './PAvatar';
import PBadge from './PBadge';
import PProgressBar from './PProgressBar';
import PSearchBar from './PSearchBar';
import PIconButton from './PIconButton';
import PStatCard from './PStatCard';
import PChipGroup from './PChipGroup';

const componentMap = {
  heading: PHeading,
  text: PText,
  button: PButton,
  text_input: PTextInput,
  option_card: POptionCard,
  image_placeholder: PImagePlaceholder,
  hero_image: PHeroImage,
  nav_bar: PNavBar,
  tab_bar: PTabBar,
  list_item: PListItem,
  card: PCard,
  divider: PDivider,
  spacer: PSpacer,
  pricing_tier: PPricingTier,
  modal: PModal,
  bottom_sheet: PModal,
  toggle: PToggle,
  avatar: PAvatar,
  badge: PBadge,
  progress_bar: PProgressBar,
  search_bar: PSearchBar,
  icon_button: PIconButton,
  stat_card: PStatCard,
  chip_group: PChipGroup,
};

function renderComponent(component, index, onNavigate) {
  const { type, ...props } = component;
  const Component = componentMap[type];

  if (!Component) {
    console.warn(`Unknown prototype component type: "${type}"`);
    return null;
  }

  // For PCard, recursively render its children array
  if (type === 'card') {
    if (props.children && Array.isArray(props.children)) {
      const childElements = props.children.map((child, childIdx) =>
        renderComponent(child, `${index}-child-${childIdx}`, onNavigate)
      );
      return (
        <Component
          key={index}
          {...props}
          renderChildren={childElements}
          children={null}
          onNavigate={onNavigate}
        />
      );
    }
    return (
      <Component
        key={index}
        {...props}
        children={null}
        onNavigate={onNavigate}
      />
    );
  }

  return <Component key={index} {...props} onNavigate={onNavigate} />;
}

const backgroundStyles = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  gradient: 'bg-gradient-to-b from-indigo-50 via-white to-white',
  dark: 'bg-gray-900',
};

export default function ScreenRenderer({ screen, onNavigate }) {
  if (!screen) return null;

  const {
    background = 'white',
    components = [],
    status_bar,
  } = screen;

  const bgClass = backgroundStyles[background] || backgroundStyles.white;

  // Separate modal components from the rest
  const modals = components.filter((c) => c.type === 'modal');
  const mainComponents = components.filter((c) => c.type !== 'modal');

  // Separate nav_bar and tab_bar for sticky positioning
  const navBar = mainComponents.find((c) => c.type === 'nav_bar');
  const tabBar = mainComponents.find((c) => c.type === 'tab_bar');
  const bodyComponents = mainComponents.filter(
    (c) => c.type !== 'nav_bar' && c.type !== 'tab_bar'
  );

  return (
    <div className={`relative w-full h-full flex flex-col ${bgClass} overflow-hidden`}>
      {/* Status bar (optional iOS-style) */}
      {status_bar !== false && (
        <div className="flex items-center justify-between px-5 py-1.5 text-[11px] font-semibold text-gray-900 shrink-0">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-[3px]">
              <div className="w-[3px] h-[7px] bg-gray-900 rounded-[1px]" />
              <div className="w-[3px] h-[9px] bg-gray-900 rounded-[1px]" />
              <div className="w-[3px] h-[11px] bg-gray-900 rounded-[1px]" />
              <div className="w-[3px] h-[7px] bg-gray-300 rounded-[1px]" />
            </div>
            <span className="ml-1">WiFi</span>
            <div className="w-6 h-3 border border-gray-900 rounded-[3px] p-[1px] ml-1">
              <div className="w-3/4 h-full bg-gray-900 rounded-[1.5px]" />
            </div>
          </div>
        </div>
      )}

      {/* Nav bar */}
      {navBar && renderComponent(navBar, 'nav', onNavigate)}

      {/* Scrollable body */}
      <motion.div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen.screen_id || screen.id || 'screen'}
            className="space-y-3 py-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {bodyComponents.map((component, idx) =>
              renderComponent(component, idx, onNavigate)
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Tab bar */}
      {tabBar && renderComponent(tabBar, 'tab', onNavigate)}

      {/* Modals rendered as overlays */}
      {modals.map((modal, idx) =>
        renderComponent(modal, `modal-${idx}`, onNavigate)
      )}
    </div>
  );
}
