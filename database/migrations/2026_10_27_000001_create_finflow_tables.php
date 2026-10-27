<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_rules', function (Blueprint $table) {
            $table->id();
            $table->string('pattern', 120)->unique();
            $table->string('category', 80);
            $table->integer('priority')->default(10)->index();
            $table->timestamps();
        });

        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('external_hash', 64)->unique();
            $table->string('description', 255);
            $table->unsignedBigInteger('amount_cents');
            $table->string('type', 16)->index(); // income | expense
            $table->string('category', 80)->index();
            $table->string('matched_rule', 120)->nullable();
            $table->date('occurred_on')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('category_rules');
    }
};
