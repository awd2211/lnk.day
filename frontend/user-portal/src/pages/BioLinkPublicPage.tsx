import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ExternalLink, Mail, Phone, MapPin, Lock, AlertTriangle, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import {
  FaTwitter, FaInstagram, FaFacebook, FaLinkedin, FaYoutube,
  FaTiktok, FaGithub, FaDiscord, FaTelegram, FaWhatsapp,
  FaSpotify, FaSnapchat, FaPinterest, FaTwitch, FaReddit
} from 'react-icons/fa';
import { SiWechat, SiSinaweibo, SiBilibili } from 'react-icons/si';

// ==================== Types ====================
interface BioLinkProfile {
  name: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string;
  avatarStyle?: 'circle' | 'square' | 'rounded';
  location?: string;
  email?: string;
  phone?: string;
  verified?: boolean;
  pronouns?: string;
}

interface BioLinkTheme {
  backgroundColor?: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    colors: string[];
    angle?: number;
  };
  backgroundImage?: string;
  backgroundBlur?: number;
  backgroundOverlay?: string;
  textColor?: string;
  secondaryTextColor?: string;
  buttonStyle?: 'filled' | 'outlined' | 'soft' | 'shadow' | 'glass';
  buttonRadius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  buttonColor?: string;
  buttonTextColor?: string;
  buttonAnimation?: 'none' | 'bounce' | 'pulse' | 'shake';
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  layout?: 'standard' | 'compact' | 'spacious';
  avatarSize?: 'small' | 'medium' | 'large';
  showSocialIconsAtTop?: boolean;
  socialIconStyle?: 'filled' | 'outlined' | 'minimal';
}

interface BioLinkSettings {
  sensitiveContent?: boolean;
  sensitiveWarningMessage?: string;
  password?: string;
  isPrivate?: boolean;
  expiresAt?: string;
}

interface CarouselImage {
  url: string;
  alt?: string;
  link?: string;
  caption?: string;
}

interface BioLinkItem {
  id: string;
  type: string;
  title?: string;
  url?: string;
  description?: string;
  thumbnailUrl?: string;
  visible: boolean;
  style?: {
    backgroundColor?: string;
    textColor?: string;
    icon?: string;
    iconUrl?: string;
    animation?: string;
    featured?: boolean;
  };
  settings?: {
    isVisible?: boolean;
    pinned?: boolean;
    scheduleStart?: string;
    scheduleEnd?: string;
    openInNewTab?: boolean;
  };
  // Embed content
  embed?: {
    type: 'youtube' | 'spotify' | 'soundcloud' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'twitch' | 'bilibili';
    embedId: string;
    autoplay?: boolean;
  };
  // Product
  product?: {
    price: number;
    currency: string;
    originalPrice?: number;
    badge?: string;
    images?: string[];
  };
  // Carousel
  carousel?: {
    images: CarouselImage[];
    height?: number;
    transitionType?: 'slide' | 'fade';
  };
  // Countdown
  countdown?: {
    targetDate: string;
    timezone?: string;
    showDays?: boolean;
    showHours?: boolean;
    showMinutes?: boolean;
    showSeconds?: boolean;
  };
  // Music
  music?: {
    provider: 'spotify' | 'apple_music' | 'soundcloud' | 'netease';
    trackUrl?: string;
    playlistUrl?: string;
  };
  // Map
  map?: {
    provider: 'google' | 'amap' | 'tencent';
    latitude: number;
    longitude: number;
    zoom?: number;
    address?: string;
    height?: number;
  };
  // Text block
  text?: {
    content: string;
    alignment?: 'left' | 'center' | 'right';
  };
  // Image block
  image?: {
    url: string;
    alt?: string;
    linkUrl?: string;
  };
  // Video block
  video?: {
    url: string;
    poster?: string;
    autoplay?: boolean;
  };
  // Subscribe form
  subscribe?: {
    placeholder?: string;
    buttonText?: string;
    successMessage?: string;
    collectName?: boolean;
    collectPhone?: boolean;
    privacyPolicyUrl?: string;
  };
  // Contact form
  contactForm?: {
    fields: Array<{
      name: string;
      type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
      label: string;
      required?: boolean;
      options?: string[];
    }>;
    submitButtonText?: string;
    successMessage?: string;
  };
}

interface BioLink {
  id: string;
  username: string;
  title: string;
  profile: BioLinkProfile;
  socialLinks: Array<{ platform: string; url: string }>;
  theme: BioLinkTheme;
  settings: BioLinkSettings;
  status: string;
}

interface BioLinkData {
  bioLink: BioLink;
  items: BioLinkItem[];
}

// ==================== Social Icons ====================
const socialIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  twitter: FaTwitter,
  x: FaTwitter,
  instagram: FaInstagram,
  facebook: FaFacebook,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  github: FaGithub,
  discord: FaDiscord,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  spotify: FaSpotify,
  snapchat: FaSnapchat,
  pinterest: FaPinterest,
  twitch: FaTwitch,
  reddit: FaReddit,
  wechat: SiWechat,
  weibo: SiSinaweibo,
  bilibili: SiBilibili,
};

// ==================== Preset Themes ====================
const PRESET_THEMES: Record<string, Partial<BioLinkTheme>> = {
  default: {
    backgroundColor: '#f8f4ff',
    textColor: '#1f2937',
    buttonColor: '#8b5cf6',
    buttonStyle: 'filled',
    buttonRadius: 'large',
  },
  midnight: {
    backgroundColor: '#0f172a',
    textColor: '#f1f5f9',
    buttonColor: '#3b82f6',
    buttonStyle: 'filled',
    buttonRadius: 'large',
  },
  sunset: {
    backgroundGradient: { type: 'linear', colors: ['#f97316', '#ec4899'], angle: 135 },
    textColor: '#ffffff',
    buttonColor: '#ffffff',
    buttonTextColor: '#f97316',
    buttonStyle: 'filled',
    buttonRadius: 'full',
  },
  ocean: {
    backgroundGradient: { type: 'linear', colors: ['#06b6d4', '#3b82f6'], angle: 180 },
    textColor: '#ffffff',
    buttonColor: 'rgba(255,255,255,0.2)',
    buttonTextColor: '#ffffff',
    buttonStyle: 'glass',
    buttonRadius: 'large',
  },
  forest: {
    backgroundGradient: { type: 'linear', colors: ['#065f46', '#047857'], angle: 180 },
    textColor: '#ecfdf5',
    buttonColor: '#10b981',
    buttonStyle: 'soft',
    buttonRadius: 'medium',
  },
  minimal: {
    backgroundColor: '#ffffff',
    textColor: '#111827',
    buttonColor: '#111827',
    buttonStyle: 'outlined',
    buttonRadius: 'none',
  },
  neon: {
    backgroundColor: '#18181b',
    textColor: '#fafafa',
    buttonColor: '#22d3ee',
    buttonStyle: 'outlined',
    buttonRadius: 'large',
    buttonAnimation: 'pulse',
  },
  rose: {
    backgroundGradient: { type: 'linear', colors: ['#fda4af', '#fb7185', '#f43f5e'], angle: 135 },
    textColor: '#ffffff',
    buttonColor: '#ffffff',
    buttonTextColor: '#e11d48',
    buttonStyle: 'shadow',
    buttonRadius: 'full',
  },
};

// ==================== Google Fonts ====================
const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Roboto', 'Open Sans', 'Montserrat', 'Lato',
  'Playfair Display', 'Merriweather', 'Noto Sans SC', 'ZCOOL XiaoWei',
];

// ==================== API URL ====================
const API_URL = '';

// ==================== Utility Functions ====================
const getBackgroundStyle = (theme: BioLinkTheme): React.CSSProperties => {
  const style: React.CSSProperties = {};

  if (theme.backgroundGradient) {
    const { type, colors, angle = 180 } = theme.backgroundGradient;
    if (type === 'linear') {
      style.background = `linear-gradient(${angle}deg, ${colors.join(', ')})`;
    } else {
      style.background = `radial-gradient(circle, ${colors.join(', ')})`;
    }
  } else if (theme.backgroundImage) {
    style.backgroundImage = `url(${theme.backgroundImage})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  } else {
    style.backgroundColor = theme.backgroundColor || '#f8f4ff';
  }

  return style;
};

const getButtonClasses = (theme: BioLinkTheme): string => {
  const classes: string[] = ['transition-all', 'duration-200'];

  // Animation
  switch (theme.buttonAnimation) {
    case 'bounce':
      classes.push('hover:animate-bounce');
      break;
    case 'pulse':
      classes.push('animate-pulse');
      break;
    case 'shake':
      classes.push('hover:animate-[shake_0.5s_ease-in-out]');
      break;
  }

  return classes.join(' ');
};

const getButtonStyle = (theme: BioLinkTheme): React.CSSProperties => {
  const buttonColor = theme.buttonColor || '#8b5cf6';
  const textColor = theme.buttonTextColor || '#ffffff';

  const radiusMap: Record<string, string> = {
    none: '0',
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem',
    full: '9999px',
  };
  const radius = radiusMap[theme.buttonRadius || 'large'];

  const base: React.CSSProperties = {
    borderRadius: radius,
    transition: 'all 0.2s ease',
  };

  switch (theme.buttonStyle) {
    case 'outlined':
      return { ...base, backgroundColor: 'transparent', border: `2px solid ${buttonColor}`, color: buttonColor };
    case 'soft':
      return { ...base, backgroundColor: `${buttonColor}20`, color: buttonColor };
    case 'shadow':
      return { ...base, backgroundColor: buttonColor, color: textColor, boxShadow: `0 4px 14px 0 ${buttonColor}40` };
    case 'glass':
      return { ...base, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', color: textColor };
    default: // filled
      return { ...base, backgroundColor: buttonColor, color: textColor };
  }
};

const getAvatarSize = (size?: string): string => {
  switch (size) {
    case 'small': return 'h-16 w-16';
    case 'large': return 'h-32 w-32';
    default: return 'h-24 w-24';
  }
};

const getFontSize = (size?: string): string => {
  switch (size) {
    case 'small': return 'text-sm';
    case 'large': return 'text-lg';
    default: return 'text-base';
  }
};

// ==================== Sub Components ====================

// Countdown Component
function CountdownBlock({ countdown }: { countdown: BioLinkItem['countdown'] }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!countdown?.targetDate) return;

    const calculateTimeLeft = () => {
      const target = new Date(countdown.targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [countdown?.targetDate]);

  if (isExpired) {
    return <div className="text-center py-4 text-gray-500">活动已结束</div>;
  }

  return (
    <div className="flex justify-center gap-4 py-4">
      {(countdown?.showDays !== false) && (
        <div className="text-center">
          <div className="text-3xl font-bold">{timeLeft.days}</div>
          <div className="text-xs opacity-70">天</div>
        </div>
      )}
      {(countdown?.showHours !== false) && (
        <div className="text-center">
          <div className="text-3xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
          <div className="text-xs opacity-70">时</div>
        </div>
      )}
      {(countdown?.showMinutes !== false) && (
        <div className="text-center">
          <div className="text-3xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
          <div className="text-xs opacity-70">分</div>
        </div>
      )}
      {(countdown?.showSeconds !== false) && (
        <div className="text-center">
          <div className="text-3xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
          <div className="text-xs opacity-70">秒</div>
        </div>
      )}
    </div>
  );
}

// Carousel Component
function CarouselBlock({ carousel }: { carousel: BioLinkItem['carousel'] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const images = carousel?.images || [];

  useEffect(() => {
    if (!isPlaying || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isPlaying, images.length]);

  if (images.length === 0) return null;

  const goTo = (index: number) => setCurrentIndex(index);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrentIndex((i) => (i + 1) % images.length);

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  const ImageContent = (
    <img
      src={currentImage.url}
      alt={currentImage.alt || ''}
      className="w-full object-cover rounded-lg"
      style={{ height: carousel?.height || 200 }}
    />
  );

  return (
    <div className="relative group">
      {currentImage.link ? (
        <a href={currentImage.link} target="_blank" rel="noopener noreferrer">{ImageContent}</a>
      ) : ImageContent}

      {currentImage.caption && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-sm p-2 rounded-b-lg">
          {currentImage.caption}
        </div>
      )}

      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="absolute top-2 right-2 bg-black/30 hover:bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Video Embed Component
function VideoEmbed({ embed }: { embed: BioLinkItem['embed'] }) {
  if (!embed) return null;

  const getEmbedUrl = () => {
    switch (embed.type) {
      case 'youtube':
        return `https://www.youtube.com/embed/${embed.embedId}${embed.autoplay ? '?autoplay=1' : ''}`;
      case 'bilibili':
        return `https://player.bilibili.com/player.html?bvid=${embed.embedId}&autoplay=${embed.autoplay ? 1 : 0}`;
      case 'vimeo':
        return `https://player.vimeo.com/video/${embed.embedId}${embed.autoplay ? '?autoplay=1' : ''}`;
      case 'spotify':
        return `https://open.spotify.com/embed/track/${embed.embedId}`;
      default:
        return null;
    }
  };

  const url = getEmbedUrl();
  if (!url) return null;

  return (
    <div className="relative w-full" style={{ paddingBottom: embed.type === 'spotify' ? '80px' : '56.25%' }}>
      <iframe
        src={url}
        className="absolute top-0 left-0 w-full h-full rounded-lg"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

// Product Card Component
function ProductCard({ item, buttonStyle, onClick }: { item: BioLinkItem; buttonStyle: React.CSSProperties; onClick: () => void }) {
  const product = item.product;
  if (!product) return null;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden">
      {item.thumbnailUrl && (
        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-4">
        {product.badge && (
          <span className="inline-block px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full mb-2">
            {product.badge}
          </span>
        )}
        <h3 className="font-semibold">{item.title}</h3>
        {item.description && <p className="text-sm opacity-70 mt-1">{item.description}</p>}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold">{product.currency}{product.price}</span>
          {product.originalPrice && (
            <span className="text-sm line-through opacity-50">{product.currency}{product.originalPrice}</span>
          )}
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className="block w-full text-center mt-3 py-2 font-medium"
            style={buttonStyle}
          >
            立即购买
          </a>
        )}
      </div>
    </div>
  );
}

// Subscribe Form Component
function SubscribeForm({ item, buttonStyle, username }: { item: BioLinkItem; buttonStyle: React.CSSProperties; username: string }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const subscribe = item.subscribe;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      await fetch(`${API_URL}/api/v1/u/${username}/subscribe/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      setStatus('success');
      setEmail('');
      setName('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <div className="text-center py-4 text-green-500">{subscribe?.successMessage || '订阅成功！'}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {subscribe?.collectName && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="您的姓名"
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-white/40"
        />
      )}
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={subscribe?.placeholder || '输入邮箱地址'}
          className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-white/40"
          required
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-4 py-2 font-medium disabled:opacity-50"
          style={buttonStyle}
        >
          {status === 'loading' ? '...' : subscribe?.buttonText || '订阅'}
        </button>
      </div>
      {status === 'error' && <p className="text-red-400 text-sm text-center">订阅失败，请稍后重试</p>}
    </form>
  );
}

// Contact Form Component
function ContactForm({ item, buttonStyle, username }: { item: BioLinkItem; buttonStyle: React.CSSProperties; username: string }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const contactForm = item.contactForm;

  if (!contactForm?.fields) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await fetch(`${API_URL}/api/v1/u/${username}/contact/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setStatus('success');
      setFormData({});
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <div className="text-center py-4 text-green-500">{contactForm.successMessage || '提交成功！'}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {contactForm.fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm mb-1">{field.label}{field.required && <span className="text-red-500">*</span>}</label>
          {field.type === 'textarea' ? (
            <textarea
              value={formData[field.name] || ''}
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
              required={field.required}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-white/40"
              rows={3}
            />
          ) : field.type === 'select' ? (
            <select
              value={formData[field.name] || ''}
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
              required={field.required}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-white/40"
            >
              <option value="">请选择</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              value={formData[field.name] || ''}
              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
              required={field.required}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 focus:outline-none focus:border-white/40"
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-2 font-medium disabled:opacity-50"
        style={buttonStyle}
      >
        {status === 'loading' ? '提交中...' : contactForm.submitButtonText || '提交'}
      </button>
      {status === 'error' && <p className="text-red-400 text-sm text-center mt-2">提交失败，请稍后重试</p>}
    </form>
  );
}

// Map Component
function MapBlock({ map }: { map: BioLinkItem['map'] }) {
  if (!map) return null;

  const getMapUrl = () => {
    switch (map.provider) {
      case 'google':
        return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${map.latitude},${map.longitude}&zoom=${map.zoom || 15}`;
      case 'amap':
        return `https://uri.amap.com/marker?position=${map.longitude},${map.latitude}&name=${encodeURIComponent(map.address || '')}`;
      default:
        return `https://www.openstreetmap.org/export/embed.html?bbox=${map.longitude - 0.01},${map.latitude - 0.01},${map.longitude + 0.01},${map.latitude + 0.01}&layer=mapnik&marker=${map.latitude},${map.longitude}`;
    }
  };

  return (
    <div className="rounded-lg overflow-hidden">
      <iframe
        src={getMapUrl()}
        width="100%"
        height={map.height || 200}
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {map.address && (
        <div className="bg-white/10 backdrop-blur-sm p-2 text-sm">
          <MapPin className="inline h-4 w-4 mr-1" />
          {map.address}
        </div>
      )}
    </div>
  );
}

// Password Protection Component
function PasswordProtection({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This will be validated on the server
    onUnlock();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-sm text-center">
        <Lock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h1 className="text-2xl font-bold text-white mb-2">此页面已加密</h1>
        <p className="text-gray-400 mb-6">请输入密码以访问此页面</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入密码"
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            解锁页面
          </button>
        </form>
      </div>
    </div>
  );
}

// Sensitive Content Warning
function SensitiveWarning({ message, onAccept }: { message?: string; onAccept: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-sm text-center">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
        <h1 className="text-2xl font-bold text-white mb-2">内容警告</h1>
        <p className="text-gray-400 mb-6">{message || '此页面可能包含敏感内容，仅适合成年人浏览。'}</p>
        <div className="space-y-3">
          <button
            onClick={onAccept}
            className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors"
          >
            我已满18岁，继续访问
          </button>
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================
export default function BioLinkPublicPage() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const isLivePreview = searchParams.get('live') === 'true'; // 实时预览模式

  const [data, setData] = useState<BioLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSensitiveWarning, setShowSensitiveWarning] = useState(false);
  const [sensitiveAccepted, setSensitiveAccepted] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);

  // 监听来自编辑器的 postMessage 实时预览数据
  useEffect(() => {
    if (!isLivePreview) return;

    const handleMessage = (event: MessageEvent) => {
      // 验证消息来源
      if (event.data?.type === 'BIO_LINK_PREVIEW_UPDATE') {
        const { bioLink } = event.data.payload;
        console.log('BioLinkPublicPage received data:', bioLink);
        if (bioLink) {
          // 编辑器使用 title/description/avatarUrl，预览页需要 profile
          // 优先使用 bioLink.profile，如果没有则从 title/description/avatarUrl 构建
          const profile: BioLinkProfile = {
            name: bioLink.profile?.name || bioLink.title || '',
            bio: bioLink.profile?.bio || bioLink.description,
            avatarUrl: bioLink.profile?.avatarUrl || bioLink.avatarUrl,
            avatar: bioLink.profile?.avatar || bioLink.profile?.avatarUrl || bioLink.avatarUrl,
            avatarStyle: bioLink.profile?.avatarStyle,
            location: bioLink.profile?.location,
            verified: bioLink.profile?.verified,
            pronouns: bioLink.profile?.pronouns,
          };

          // 转换 blocks 为 items
          const items: BioLinkItem[] = (bioLink.blocks || []).map((block: any) => ({
            id: block.id,
            type: block.type,
            title: block.content?.title || block.title,
            url: block.content?.url || block.url,
            description: block.content?.description || block.description,
            thumbnailUrl: block.content?.thumbnailUrl || block.thumbnailUrl,
            visible: block.isVisible !== false,
            style: block.style,
            settings: block.settings,
            embed: block.embed,
            product: block.product,
            carousel: block.carousel,
            countdown: block.countdown || (block.content?.targetDate ? { targetDate: block.content.targetDate } : undefined),
            music: block.music,
            map: block.map || (block.content?.address ? { address: block.content.address, zoom: block.content.zoom } : undefined),
            text: block.text || (block.type === 'text' || block.type === 'header' ? { content: block.content?.text } : undefined),
            image: block.image || (block.type === 'image' ? { url: block.content?.url, alt: block.content?.alt } : undefined),
            video: block.video || (block.type === 'video' ? { url: block.content?.url, autoplay: block.content?.autoplay } : undefined),
            subscribe: block.subscribe || (block.type === 'subscribe' || block.type === 'email' ? {
              placeholder: block.content?.placeholder,
              buttonText: block.content?.buttonText,
              successMessage: block.content?.successMessage,
              collectName: block.content?.collectName,
            } : undefined),
            contactForm: block.contactForm,
          }));

          console.log('Transformed data:', { profile, items });

          setData({
            bioLink: {
              id: bioLink.id,
              username: bioLink.username,
              title: bioLink.title,
              profile,
              socialLinks: bioLink.socialLinks || [],
              theme: bioLink.theme || {},
              settings: bioLink.settings || {},
              status: bioLink.isPublished ? 'published' : 'draft',
            },
            items,
          });
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 通知父窗口，iframe 已准备好接收数据
    // 使用 setTimeout 确保事件监听器已注册
    const readyTimer = setTimeout(() => {
      if (window.parent !== window) {
        console.log('Sending BIO_LINK_PREVIEW_READY to parent');
        window.parent.postMessage({ type: 'BIO_LINK_PREVIEW_READY' }, '*');
      }
    }, 50);

    return () => {
      clearTimeout(readyTimer);
      window.removeEventListener('message', handleMessage);
    };
  }, [isLivePreview]);

  useEffect(() => {
    // 如果是实时预览模式，等待 postMessage 数据，不从 API 获取
    if (isLivePreview) {
      setLoading(true); // 等待父窗口发送数据
      return;
    }

    if (!username) return;

    const fetchBioLink = async () => {
      try {
        setLoading(true);
        const previewParam = isPreview ? '?preview=true' : '';
        const response = await fetch(`${API_URL}/api/v1/bio-links/username/${username}${previewParam}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('页面不存在');
          } else if (response.status === 401) {
            setIsPasswordProtected(true);
          } else {
            setError('加载失败');
          }
          return;
        }

        const result = await response.json();
        setData(result);

        // Check for sensitive content
        if (result.bioLink.settings?.sensitiveContent && !sensitiveAccepted) {
          setShowSensitiveWarning(true);
        }
      } catch (err) {
        setError('网络错误');
      } finally {
        setLoading(false);
      }
    };

    fetchBioLink();
  }, [username, isPreview, sensitiveAccepted]);

  // Load Google Font
  useEffect(() => {
    if (data?.bioLink.theme.fontFamily) {
      const font = data.bioLink.theme.fontFamily;
      if (GOOGLE_FONTS.includes(font)) {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}:wght@400;500;600;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
    }
  }, [data?.bioLink.theme.fontFamily]);

  // Track link click
  const handleLinkClick = useCallback(async (itemId: string) => {
    if (!username || isPreview) return;
    try {
      await fetch(`${API_URL}/api/v1/bio-links/username/${username}/click/${itemId}`, { method: 'POST' });
    } catch { /* ignore */ }
  }, [username, isPreview]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // Password protection
  if (isPasswordProtected && !passwordUnlocked) {
    return <PasswordProtection onUnlock={() => setPasswordUnlocked(true)} />;
  }

  // Sensitive content warning
  if (showSensitiveWarning && !sensitiveAccepted) {
    return (
      <SensitiveWarning
        message={data?.bioLink.settings?.sensitiveWarningMessage}
        onAccept={() => {
          setSensitiveAccepted(true);
          setShowSensitiveWarning(false);
        }}
      />
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <h1 className="text-2xl font-bold text-gray-800">{error || '页面不存在'}</h1>
        <p className="mt-2 text-gray-600">请检查链接是否正确</p>
      </div>
    );
  }

  const { bioLink, items } = data;
  const { profile, theme, socialLinks } = bioLink;
  const textColor = theme.textColor || '#1f2937';
  const buttonStyle = getButtonStyle(theme);
  const buttonClasses = getButtonClasses(theme);
  const bgStyle = getBackgroundStyle(theme);
  const avatarSize = getAvatarSize(theme.avatarSize);
  const fontSize = getFontSize(theme.fontSize);
  const fontFamily = theme.fontFamily ? { fontFamily: theme.fontFamily } : {};
  const layoutPadding = theme.layout === 'compact' ? 'space-y-2' : theme.layout === 'spacious' ? 'space-y-6' : 'space-y-4';

  // Filter visible items and check schedule
  const now = new Date();
  const visibleItems = items.filter(item => {
    if (!item.visible && item.settings?.isVisible === false) return false;
    if (item.settings?.scheduleStart && new Date(item.settings.scheduleStart) > now) return false;
    if (item.settings?.scheduleEnd && new Date(item.settings.scheduleEnd) < now) return false;
    return true;
  });

  // Render item based on type
  const renderItem = (item: BioLinkItem) => {
    switch (item.type) {
      case 'link':
        if (!item.url) return null;
        return (
          <a
            key={item.id}
            href={item.url}
            target={item.settings?.openInNewTab !== false ? '_blank' : '_self'}
            rel="noopener noreferrer"
            onClick={() => handleLinkClick(item.id)}
            className={`flex items-center justify-center gap-2 px-6 py-4 font-medium shadow-sm hover:shadow-md ${buttonClasses}`}
            style={{
              ...buttonStyle,
              ...(item.style?.backgroundColor ? { backgroundColor: item.style.backgroundColor } : {}),
              ...(item.style?.textColor ? { color: item.style.textColor } : {}),
            }}
          >
            {item.style?.iconUrl && <img src={item.style.iconUrl} alt="" className="h-5 w-5" />}
            <span>{item.title || item.url}</span>
            <ExternalLink className="h-4 w-4 opacity-60" />
          </a>
        );

      case 'header':
        return (
          <h2 key={item.id} className="pt-4 text-center text-lg font-semibold" style={{ color: textColor }}>
            {item.title}
          </h2>
        );

      case 'text':
        return (
          <p
            key={item.id}
            className={`text-sm opacity-80 ${item.text?.alignment === 'left' ? 'text-left' : item.text?.alignment === 'right' ? 'text-right' : 'text-center'}`}
            style={{ color: textColor }}
          >
            {item.text?.content || item.title}
          </p>
        );

      case 'divider':
        return <hr key={item.id} className="my-4 border-t opacity-20" style={{ borderColor: textColor }} />;

      case 'image':
        if (!item.image?.url && !item.thumbnailUrl) return null;
        const imgContent = (
          <img
            src={item.image?.url || item.thumbnailUrl}
            alt={item.image?.alt || item.title || ''}
            className="w-full rounded-lg object-cover"
          />
        );
        return item.image?.linkUrl ? (
          <a key={item.id} href={item.image.linkUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleLinkClick(item.id)}>
            {imgContent}
          </a>
        ) : (
          <div key={item.id}>{imgContent}</div>
        );

      case 'video':
        if (item.video?.url) {
          return (
            <video
              key={item.id}
              src={item.video.url}
              poster={item.video.poster}
              controls
              autoPlay={item.video.autoplay}
              loop
              muted={item.video.autoplay}
              className="w-full rounded-lg"
            />
          );
        }
        return null;

      case 'embed':
        return <div key={item.id}><VideoEmbed embed={item.embed} /></div>;

      case 'carousel':
        return <div key={item.id}><CarouselBlock carousel={item.carousel} /></div>;

      case 'countdown':
        return (
          <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4" style={{ color: textColor }}>
            {item.title && <h3 className="text-center font-semibold mb-2">{item.title}</h3>}
            <CountdownBlock countdown={item.countdown} />
          </div>
        );

      case 'product':
        return <div key={item.id}><ProductCard item={item} buttonStyle={buttonStyle} onClick={() => handleLinkClick(item.id)} /></div>;

      case 'subscribe':
        return (
          <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4" style={{ color: textColor }}>
            {item.title && <h3 className="text-center font-semibold mb-3">{item.title}</h3>}
            <SubscribeForm item={item} buttonStyle={buttonStyle} username={username || ''} />
          </div>
        );

      case 'contact_form':
        return (
          <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-4" style={{ color: textColor }}>
            {item.title && <h3 className="text-center font-semibold mb-3">{item.title}</h3>}
            <ContactForm item={item} buttonStyle={buttonStyle} username={username || ''} />
          </div>
        );

      case 'map':
        return <div key={item.id}><MapBlock map={item.map} /></div>;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ ...bgStyle, ...fontFamily }}>
      {/* Background overlay for images */}
      {theme.backgroundImage && theme.backgroundOverlay && (
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundColor: theme.backgroundOverlay }} />
      )}

      <div className="relative mx-auto max-w-md">
        {/* Preview Banner */}
        {isPreview && bioLink.status !== 'published' && (
          <div className="mb-4 rounded-lg bg-yellow-100 px-4 py-2 text-center text-sm text-yellow-800">
            预览模式 - 此页面尚未发布
          </div>
        )}

        {/* Profile Section */}
        <div className="mb-8 text-center">
          {/* Avatar */}
          {(profile.avatar || profile.avatarUrl) ? (
            <img
              src={profile.avatar || profile.avatarUrl}
              alt={profile.name}
              className={`mx-auto ${avatarSize} ${
                profile.avatarStyle === 'square' ? 'rounded-none' :
                profile.avatarStyle === 'rounded' ? 'rounded-lg' : 'rounded-full'
              } border-4 border-white object-cover shadow-lg`}
            />
          ) : (
            <div
              className={`mx-auto flex ${avatarSize} items-center justify-center rounded-full border-4 border-white text-3xl font-bold shadow-lg`}
              style={{ backgroundColor: theme.buttonColor || '#8b5cf6', color: '#fff' }}
            >
              {profile.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}

          {/* Verified Badge */}
          {profile.verified && (
            <div className="flex justify-center mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                已认证
              </span>
            </div>
          )}

          {/* Name */}
          <h1 className={`mt-4 text-2xl font-bold ${fontSize}`} style={{ color: textColor }}>
            {profile.name || bioLink.title}
          </h1>

          {/* Pronouns */}
          {profile.pronouns && (
            <p className="text-sm opacity-60" style={{ color: textColor }}>{profile.pronouns}</p>
          )}

          {/* Bio */}
          {profile.bio && (
            <p className={`mt-2 ${fontSize} opacity-80`} style={{ color: theme.secondaryTextColor || textColor }}>
              {profile.bio}
            </p>
          )}

          {/* Location */}
          {profile.location && (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs opacity-60" style={{ color: textColor }}>
              <MapPin className="h-3 w-3" />
              {profile.location}
            </p>
          )}

          {/* Social Links */}
          {socialLinks && socialLinks.length > 0 && (theme.showSocialIconsAtTop !== false) && (
            <div className="mt-4 flex justify-center gap-3">
              {socialLinks.map((link, index) => {
                const Icon = socialIcons[link.platform.toLowerCase()] || ExternalLink;
                const iconStyle = theme.socialIconStyle || 'filled';
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-full p-2 transition-transform hover:scale-110 ${
                      iconStyle === 'outlined' ? 'border-2' : iconStyle === 'minimal' ? '' : ''
                    }`}
                    style={{
                      backgroundColor: iconStyle === 'filled' ? `${theme.buttonColor || '#8b5cf6'}20` : 'transparent',
                      borderColor: iconStyle === 'outlined' ? theme.buttonColor : 'transparent',
                      color: theme.buttonColor || '#8b5cf6',
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Links Section */}
        <div className={layoutPadding}>
          {visibleItems.map(renderItem)}
        </div>

        {/* Contact Section */}
        {(profile.email || profile.phone) && (
          <div className="mt-8 flex justify-center gap-4">
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
                style={{ color: textColor }}
              >
                <Mail className="h-4 w-4" />
                联系我
              </a>
            )}
            {profile.phone && (
              <a
                href={`tel:${profile.phone}`}
                className="flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
                style={{ color: textColor }}
              >
                <Phone className="h-4 w-4" />
                拨打电话
              </a>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <a
            href="https://lnk.day"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs opacity-40 hover:opacity-60"
            style={{ color: textColor }}
          >
            Powered by lnk.day
          </a>
        </div>
      </div>
    </div>
  );
}
