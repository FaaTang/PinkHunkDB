package dailysecret

import "testing"

func TestStorePutGetDeleteConnectionSecret(t *testing.T) {
	root := t.TempDir()
	store := NewStore(root)

	bundle := ConnectionBundle{
		Password:    "postgres-secret",
		OpaqueDSN:   "postgres://user:pass@db.local/app",
		SSHPassword: "ssh-secret",
	}
	if err := store.PutConnection("conn-1", bundle); err != nil {
		t.Fatalf("PutConnection returned error: %v", err)
	}

	got, ok, err := store.GetConnection("conn-1")
	if err != nil {
		t.Fatalf("GetConnection returned error: %v", err)
	}
	if !ok {
		t.Fatal("expected connection bundle to exist")
	}
	if got.Password != "postgres-secret" || got.OpaqueDSN != bundle.OpaqueDSN || got.SSHPassword != "ssh-secret" {
		t.Fatalf("unexpected bundle: %#v", got)
	}

	if err := store.DeleteConnection("conn-1"); err != nil {
		t.Fatalf("DeleteConnection returned error: %v", err)
	}
	got, ok, err = store.GetConnection("conn-1")
	if err != nil {
		t.Fatalf("GetConnection after delete returned error: %v", err)
	}
	if ok {
		t.Fatalf("expected missing connection bundle after delete, got %#v", got)
	}
}

func TestStorePutGetDeleteGlobalProxySecret(t *testing.T) {
	root := t.TempDir()
	store := NewStore(root)

	if err := store.PutGlobalProxy(GlobalProxyBundle{Password: "proxy-secret"}); err != nil {
		t.Fatalf("PutGlobalProxy returned error: %v", err)
	}

	got, ok, err := store.GetGlobalProxy()
	if err != nil {
		t.Fatalf("GetGlobalProxy returned error: %v", err)
	}
	if !ok || got.Password != "proxy-secret" {
		t.Fatalf("unexpected global proxy bundle: %#v ok=%v", got, ok)
	}

	if err := store.DeleteGlobalProxy(); err != nil {
		t.Fatalf("DeleteGlobalProxy returned error: %v", err)
	}
	_, ok, err = store.GetGlobalProxy()
	if err != nil {
		t.Fatalf("GetGlobalProxy after delete returned error: %v", err)
	}
	if ok {
		t.Fatal("expected global proxy bundle to be deleted")
	}
}

