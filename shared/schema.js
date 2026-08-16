/**
 * pdesign Component Library Schema
 * 
 * Defines the JSON schema that the LLM outputs and the renderer consumes.
 * This is the contract between the AI and the rendering engine.
 */

// All available component types in the prototype library
export const COMPONENT_TYPES = [
  'heading',
  'text',
  'button',
  'text_input',
  'option_card',
  'image_placeholder',
  'nav_bar',
  'tab_bar',
  'list_item',
  'card',
  'divider',
  'spacer',
  'pricing_tier',
  'modal',
  'toggle',
  'avatar',
  'badge',
  'progress_bar',
  'search_bar',
  'icon_button',
  'hero_image',
  'chip_group',
  'bottom_sheet',
  'stat_card',
];

// Validation: check if a component type is valid
export function isValidComponentType(type) {
  return COMPONENT_TYPES.includes(type);
}

// Validation: check if a screen object is structurally valid
export function validateScreen(screen) {
  const errors = [];

  if (!screen.screen_id || typeof screen.screen_id !== 'string') {
    errors.push('screen_id is required and must be a string');
  }

  if (!screen.title || typeof screen.title !== 'string') {
    errors.push('title is required and must be a string');
  }

  if (!Array.isArray(screen.components)) {
    errors.push('components must be an array');
  } else {
    screen.components.forEach((comp, i) => {
      if (!comp.type) {
        errors.push(`Component ${i}: type is required`);
      } else if (!isValidComponentType(comp.type)) {
        errors.push(`Component ${i}: unknown type "${comp.type}"`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// Validation: check if a flow object is structurally valid
export function validateFlow(flow) {
  const errors = [];

  if (!flow.flow_id || typeof flow.flow_id !== 'string') {
    errors.push('flow_id is required and must be a string');
  }

  if (!flow.name || typeof flow.name !== 'string') {
    errors.push('name is required and must be a string');
  }

  if (!Array.isArray(flow.screens) || flow.screens.length === 0) {
    errors.push('screens must be a non-empty array');
  } else {
    const screenIds = new Set();
    flow.screens.forEach((screen, i) => {
      const result = validateScreen(screen);
      if (!result.valid) {
        errors.push(`Screen ${i} (${screen.screen_id || 'unknown'}): ${result.errors.join(', ')}`);
      }
      if (screen.screen_id) screenIds.add(screen.screen_id);
    });

    // Validate on_tap targets reference valid screen_ids
    flow.screens.forEach((screen) => {
      if (Array.isArray(screen.components)) {
        screen.components.forEach((comp) => {
          if (comp.on_tap && !screenIds.has(comp.on_tap)) {
            errors.push(`Screen "${screen.screen_id}", component "${comp.text || comp.type}": on_tap target "${comp.on_tap}" is not a valid screen_id`);
          }
          // Check nested components (e.g., card children, tab_bar tabs)
          if (Array.isArray(comp.tabs)) {
            comp.tabs.forEach((tab) => {
              if (tab.on_tap && !screenIds.has(tab.on_tap)) {
                errors.push(`Screen "${screen.screen_id}", tab "${tab.text}": on_tap target "${tab.on_tap}" is not a valid screen_id`);
              }
            });
          }
          if (Array.isArray(comp.buttons)) {
            comp.buttons.forEach((btn) => {
              if (btn.on_tap && !screenIds.has(btn.on_tap)) {
                errors.push(`Screen "${screen.screen_id}", button "${btn.text}": on_tap target "${btn.on_tap}" is not a valid screen_id`);
              }
            });
          }
          if (Array.isArray(comp.children)) {
            comp.children.forEach((child) => {
              if (child.on_tap && !screenIds.has(child.on_tap)) {
                errors.push(`Screen "${screen.screen_id}", child "${child.text || child.type}": on_tap target "${child.on_tap}" is not a valid screen_id`);
              }
            });
          }
        });
      }
    });
  }

  if (!flow.start_screen || typeof flow.start_screen !== 'string') {
    errors.push('start_screen is required and must be a string');
  } else if (Array.isArray(flow.screens)) {
    const ids = flow.screens.map((s) => s.screen_id);
    if (!ids.includes(flow.start_screen)) {
      errors.push(`start_screen "${flow.start_screen}" is not a valid screen_id`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Example flow for testing/demo purposes
export const DEMO_FLOW = {
  flow_id: 'demo_fitness_app',
  name: 'FitTrack Onboarding',
  start_screen: 'welcome',
  screens: [
    {
      screen_id: 'welcome',
      title: 'Welcome',
      background: 'gradient',
      status_bar: true,
      components: [
        { type: 'spacer', size: 'lg' },
        { type: 'hero_image', aspect_ratio: '1:1', label: 'Fitness App Logo' },
        { type: 'spacer', size: 'md' },
        { type: 'heading', text: 'Welcome to FitTrack', level: 1 },
        { type: 'text', text: 'Your personal fitness journey starts here. Track workouts, set goals, and transform your body.', variant: 'body' },
        { type: 'spacer', size: 'lg' },
        { type: 'button', text: 'Get Started', variant: 'primary', on_tap: 'signup' },
        { type: 'spacer', size: 'sm' },
        { type: 'button', text: 'I already have an account', variant: 'outline', on_tap: 'signup' },
      ],
    },
    {
      screen_id: 'signup',
      title: 'Create Account',
      background: 'white',
      status_bar: true,
      components: [
        { type: 'nav_bar', title: 'Sign Up', show_back: true, on_back: 'welcome' },
        { type: 'spacer', size: 'md' },
        { type: 'heading', text: 'Create your account', level: 2 },
        { type: 'text', text: 'Join 2 million+ people already using FitTrack', variant: 'caption' },
        { type: 'spacer', size: 'md' },
        { type: 'text_input', label: 'Full Name', placeholder: 'John Doe' },
        { type: 'spacer', size: 'sm' },
        { type: 'text_input', label: 'Email', placeholder: 'john@example.com' },
        { type: 'spacer', size: 'sm' },
        { type: 'text_input', label: 'Password', placeholder: '••••••••' },
        { type: 'spacer', size: 'lg' },
        { type: 'button', text: 'Create Account', variant: 'primary', on_tap: 'goal_selection' },
        { type: 'spacer', size: 'sm' },
        { type: 'divider' },
        { type: 'spacer', size: 'sm' },
        { type: 'button', text: 'Continue with Google', variant: 'secondary', on_tap: 'goal_selection' },
      ],
    },
    {
      screen_id: 'goal_selection',
      title: 'Goal Selection',
      background: 'white',
      status_bar: true,
      components: [
        { type: 'nav_bar', title: 'Your Goal', show_back: true, on_back: 'signup' },
        { type: 'spacer', size: 'md' },
        { type: 'heading', text: "What's your fitness goal?", level: 2 },
        { type: 'text', text: "We'll customize your experience based on your answer.", variant: 'caption' },
        { type: 'spacer', size: 'md' },
        { type: 'option_card', text: 'Lose Weight', subtitle: 'Burn fat and get lean', icon: 'flame', on_tap: 'paywall' },
        { type: 'spacer', size: 'sm' },
        { type: 'option_card', text: 'Build Muscle', subtitle: 'Get stronger and bigger', icon: 'dumbbell', on_tap: 'paywall' },
        { type: 'spacer', size: 'sm' },
        { type: 'option_card', text: 'Stay Active', subtitle: 'Maintain a healthy lifestyle', icon: 'heart', on_tap: 'paywall' },
        { type: 'spacer', size: 'sm' },
        { type: 'option_card', text: 'Improve Flexibility', subtitle: 'Stretch and move better', icon: 'activity', on_tap: 'paywall' },
      ],
    },
    {
      screen_id: 'paywall',
      title: 'Go Premium',
      background: 'gradient',
      status_bar: true,
      components: [
        { type: 'nav_bar', title: '', show_back: true, on_back: 'goal_selection' },
        { type: 'spacer', size: 'sm' },
        { type: 'heading', text: 'Unlock Your Full Potential', level: 1 },
        { type: 'text', text: 'Get unlimited access to all features with FitTrack Pro', variant: 'body' },
        { type: 'spacer', size: 'md' },
        { type: 'pricing_tier', name: 'Monthly', price: '$9.99/mo', features: ['Unlimited workouts', 'AI coaching', 'Progress tracking'], cta_text: 'Start Free Trial', highlighted: false, on_tap: 'dashboard' },
        { type: 'spacer', size: 'sm' },
        { type: 'pricing_tier', name: 'Annual', price: '$59.99/yr', features: ['Everything in Monthly', 'Save 50%', 'Priority support', 'Meal planning'], cta_text: 'Best Value — Start Trial', highlighted: true, on_tap: 'dashboard' },
        { type: 'spacer', size: 'md' },
        { type: 'button', text: 'Continue with free plan', variant: 'outline', on_tap: 'dashboard' },
      ],
    },
    {
      screen_id: 'dashboard',
      title: 'Dashboard',
      background: 'white',
      status_bar: true,
      components: [
        { type: 'nav_bar', title: 'FitTrack', show_back: false },
        { type: 'spacer', size: 'sm' },
        { type: 'heading', text: 'Good morning, John! 👋', level: 2 },
        { type: 'text', text: "Here's your fitness summary for today", variant: 'caption' },
        { type: 'spacer', size: 'md' },
        { type: 'stat_card', title: 'Calories Burned', value: '1,240', subtitle: 'of 2,000 goal', icon: 'flame' },
        { type: 'spacer', size: 'sm' },
        { type: 'progress_bar', value: 62, max: 100, label: 'Daily Goal Progress' },
        { type: 'spacer', size: 'md' },
        { type: 'heading', text: "Today's Workouts", level: 3 },
        { type: 'spacer', size: 'sm' },
        { type: 'list_item', title: 'Morning Run', subtitle: '5.2 km • 32 min' },
        { type: 'list_item', title: 'Upper Body Strength', subtitle: '45 min • 12 exercises' },
        { type: 'spacer', size: 'md' },
        { type: 'tab_bar', tabs: [
          { text: 'Home', icon: 'home', active: true, on_tap: 'dashboard' },
          { text: 'Workouts', icon: 'dumbbell', active: false },
          { text: 'Stats', icon: 'bar-chart', active: false },
          { text: 'Profile', icon: 'user', active: false },
        ]},
      ],
    },
  ],
};
