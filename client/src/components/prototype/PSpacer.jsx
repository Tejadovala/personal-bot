const sizeMap = {
  sm: 'h-3',
  md: 'h-6',
  lg: 'h-10',
};

export default function PSpacer({ size = 'md', onNavigate }) {
  const heightClass = sizeMap[size] || sizeMap.md;
  return <div className={heightClass} />;
}
