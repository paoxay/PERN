export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {subtitle ? <p className="page-header__sub">{subtitle}</p> : null}
    </header>
  );
}
