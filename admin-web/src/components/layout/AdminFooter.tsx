const businessInfo = [
  { label: '상호', value: '세종고운간호전문학원(부설 세종고운요양보호사교육원)' },
  { label: '대표자명', value: '오혜숙' },
  { label: '사업자번호', value: '706-98-00293' },
  { label: '사업장 주소', value: '세종로1219 세종중앙타워 301, 302호' },
  { label: '전화번호', value: '044-864-8551', href: 'tel:044-864-8551' },
  { label: '이메일', value: 'tpwhdrhdns@naver.com', href: 'mailto:tpwhdrhdns@naver.com' },
];

export function AdminFooter() {
  return (
    <footer className="admin-business-footer" aria-label="학원 사업자 정보">
      <div className="admin-business-footer__inner">
        {businessInfo.map((item) => (
          <span className="admin-business-footer__item" key={item.label}>
            <strong>{item.label}:</strong>{' '}
            {item.href ? <a href={item.href}>{item.value}</a> : <span>{item.value}</span>}
          </span>
        ))}
      </div>
    </footer>
  );
}
