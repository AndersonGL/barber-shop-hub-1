import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Scissors, ShoppingCart, Heart, Package, LogOut, Settings, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  cartCount?: number;
}

const Navbar = ({ cartCount = 0 }: NavbarProps) => {
  const { user, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-gold">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Scissors className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold font-display tracking-wider text-gradient-gold">SHOPPING BARBER</span>
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link to="/admin">
              <Button variant={isActive('/admin') ? 'default' : 'ghost'} size="sm" className={isActive('/admin') ? 'bg-gradient-gold text-primary-foreground' : ''}>
                <Settings className="h-4 w-4 mr-1" />
                Admin
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/favorites">
                <Button variant="ghost" size="sm" className={isActive('/favorites') ? 'text-primary' : ''}>
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className={isActive('/orders') ? 'text-primary' : ''}>
                  <Package className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="sm" className={isActive('/cart') ? 'text-primary' : ''}>
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-gold text-primary-foreground">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </>
          )}
          <Link to="/profile">
            <Button variant="ghost" size="sm" className={isActive('/profile') ? 'text-primary' : ''}>
              <User className="h-4 w-4" />
              <span className="hidden sm:inline ml-1 text-xs">{profile?.company_name || user?.email}</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
