package app

import (
	"errors"
	"testing"
)

func TestShouldUseManagedSQLTransaction_TrinoAlwaysUsesPlainExecution(t *testing.T) {
	t.Parallel()

	if shouldUseManagedSQLTransaction("trino", "UPDATE hive.default.orders SET status = 'done'") {
		t.Fatal("expected trino DML to skip SQL editor managed transactions")
	}
	if shouldUseManagedSQLTransaction("trino", "BEGIN; UPDATE hive.default.orders SET status = 'done'; COMMIT;") {
		t.Fatal("expected trino explicit transactions to stay unmanaged")
	}
}

func TestRollbackPendingSQLTransactionsOnShutdown(t *testing.T) {
	t.Parallel()

	app := NewApp()
	okFinisher := &fakeManagedTransactionFinisher{}
	failFinisher := &fakeManagedTransactionFinisher{rollbackErr: errors.New("already closed")}
	textFinisher := &fakeManagedTransactionFinisher{}

	app.sqlTransactions["tx-ok"] = &managedSQLTransaction{
		id:         "tx-ok",
		execer:     okFinisher,
		transactor: okFinisher,
		dbType:     "postgres",
	}
	app.sqlTransactions["tx-fail"] = &managedSQLTransaction{
		id:         "tx-fail",
		execer:     failFinisher,
		transactor: failFinisher,
		dbType:     "mysql",
	}
	app.sqlTransactions["tx-text"] = &managedSQLTransaction{
		id:          "tx-text",
		execer:      textFinisher,
		dbType:      "oracle",
		rollbackSQL: "ROLLBACK",
	}

	app.rollbackPendingSQLTransactionsOnShutdown()

	if len(app.sqlTransactions) != 0 {
		t.Fatalf("expected pending transactions map to be empty after shutdown rollback, got %d", len(app.sqlTransactions))
	}
	if okFinisher.rollbackCalls != 1 {
		t.Fatalf("expected driver transaction rollback once, got %d", okFinisher.rollbackCalls)
	}
	if okFinisher.closeCalls != 1 {
		t.Fatalf("expected driver transaction close once, got %d", okFinisher.closeCalls)
	}
	if failFinisher.rollbackCalls != 1 || failFinisher.closeCalls != 1 {
		t.Fatalf("expected failed rollback to still close session, rollback=%d close=%d", failFinisher.rollbackCalls, failFinisher.closeCalls)
	}
	if len(textFinisher.execQueries) != 1 || textFinisher.execQueries[0] != "ROLLBACK" {
		t.Fatalf("expected text-path ROLLBACK, got %#v", textFinisher.execQueries)
	}
	if textFinisher.closeCalls != 1 {
		t.Fatalf("expected text-path session close once, got %d", textFinisher.closeCalls)
	}
}
